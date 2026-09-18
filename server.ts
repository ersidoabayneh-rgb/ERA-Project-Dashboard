import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getMySQLPool, initMySQLTables, testMySQLConnection, diagnoseMySQLConnection } from './src/lib/mysql.js';
import {
  initServerDatabase,
  serverGetProjects,
  serverSaveProject,
  serverDeleteProject,
  serverGetUsers,
  serverSaveUsers,
  serverDeleteUser,
  serverGetApprovals,
  serverSaveApprovals,
  serverGetConfig,
  serverSaveConfig,
  serverGetDbStats,
  serverSyncAllWithMySQL
} from './src/lib/serverDb.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle explicit HTTP upgrade to WebSocket for /ws and /api/ws endpoints
  server.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const parsedUrl = new URL(request.url || '', `http://${host}`);
      const pathname = parsedUrl.pathname;
      if (pathname === '/ws' || pathname === '/api/ws' || pathname === '/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      socket.destroy();
    }
  });

  // Track active real-time WebSocket clients and SSE response streams
  const connectedClients = new Set<WebSocket>();
  const sseClients = new Set<express.Response>();

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    (ws as any).isAlive = true;

    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    broadcastPresence();

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'JOIN') {
          broadcastPresence();
        } else if (parsed.type === 'PONG') {
          (ws as any).isAlive = true;
        } else if (parsed.type && (parsed.payload || parsed.data)) {
          // Relay real-time client mutations to all other connected devices
          const relayMsg = JSON.stringify({
            ...parsed,
            payload: parsed.payload || parsed.data,
            data: parsed.data || parsed.payload,
            timestamp: new Date().toISOString()
          });
          for (const client of connectedClients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              try { client.send(relayMsg); } catch (e) {}
            }
          }
          const sseMsg = `data: ${relayMsg}\n\n`;
          for (const sseRes of sseClients) {
            try { sseRes.write(sseMsg); } catch (e) { sseClients.delete(sseRes); }
          }
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      broadcastPresence();
    });

    ws.on('error', () => {
      connectedClients.delete(ws);
    });
  });

  function broadcastPresence() {
    const payload = { activeUsers: connectedClients.size + sseClients.size };
    const rawData = JSON.stringify({
      type: 'PRESENCE_UPDATE',
      payload,
      data: payload,
      timestamp: new Date().toISOString()
    });
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(rawData); } catch (e) {}
      }
    }
    const sseMsg = `data: ${rawData}\n\n`;
    for (const sseRes of sseClients) {
      try { sseRes.write(sseMsg); } catch (e) { sseClients.delete(sseRes); }
    }
  }

  function broadcastRealtime(type: string, payload: any) {
    const rawObj = {
      type,
      payload,
      data: payload,
      timestamp: new Date().toISOString()
    };
    const wsMessage = JSON.stringify(rawObj);
    const sseMessage = `data: ${wsMessage}\n\n`;

    // 1. Send via WebSocket connections
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(wsMessage); } catch (e) {}
      }
    }

    // 2. Send via SSE event streams
    for (const sseRes of sseClients) {
      try { sseRes.write(sseMessage); } catch (e) { sseClients.delete(sseRes); }
    }
  }

  // Periodic heartbeat every 15 seconds with dead connection pruning
  setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as any;
      if (extWs.isAlive === false) {
        connectedClients.delete(ws);
        return ws.terminate();
      }
      extWs.isAlive = false;
      try { ws.ping(); } catch (e) {}
    });

    const pingObj = { type: 'PING', timestamp: new Date().toISOString() };
    const wsPing = JSON.stringify(pingObj);
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(wsPing); } catch (e) {}
      }
    }
    const ssePing = `data: ${wsPing}\n\n`;
    for (const sseRes of sseClients) {
      try { sseRes.write(ssePing); } catch (e) { sseClients.delete(sseRes); }
    }
  }, 15000);

  // Middleware for parsing JSON payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // SSE (Server-Sent Events) real-time event stream fallback endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const initialConnectedMsg = JSON.stringify({ type: 'CONNECTED', activeUsers: connectedClients.size + sseClients.size + 1, timestamp: new Date().toISOString() });
    res.write(`data: ${initialConnectedMsg}\n\n`);

    sseClients.add(res);
    broadcastPresence();

    req.on('close', () => {
      sseClients.delete(res);
      broadcastPresence();
    });
  });

  // Initialize persistent server database engine and MySQL
  await initServerDatabase().catch((e) => console.warn('Server DB init warning:', e));
  initMySQLTables().catch(() => false);

  // Health and realtime sync status endpoint
  app.get('/api/health', async (req, res) => {
    const isConn = await testMySQLConnection().catch(() => false);
    const stats = serverGetDbStats();
    const rawHost = process.env.MYSQL_HOST || '';
    const cleanHost = (rawHost && !rawHost.includes('ethiotelecom')) ? rawHost : 'Enterprise Cloud Server';
    const rawDbName = process.env.MYSQL_DATABASE || '';
    const cleanDbName = (rawDbName && !rawDbName.includes('eradash')) ? rawDbName : 'era_dashboard';

    res.json({
      status: 'ok',
      database: isConn ? 'mysql+server_db' : 'persistent_server_db',
      mysqlConnected: isConn,
      serverHost: cleanHost,
      serverProvider: 'Enterprise Central Database',
      databaseName: cleanDbName,
      stats,
      realtimeClients: connectedClients.size + sseClients.size,
      timestamp: new Date().toISOString()
    });
  });

  // Dedicated sync status endpoint for rapid polling & delta detection
  app.get('/api/sync/status', (req, res) => {
    const stats = serverGetDbStats();
    const rawHost = process.env.MYSQL_HOST || '';
    const cleanHost = (rawHost && !rawHost.includes('ethiotelecom')) ? rawHost : 'Enterprise Cloud Server';
    const rawDbName = process.env.MYSQL_DATABASE || '';
    const cleanDbName = (rawDbName && !rawDbName.includes('eradash')) ? rawDbName : 'era_dashboard';

    res.json({
      status: 'active',
      serverHost: cleanHost,
      serverProvider: 'Enterprise Central Database',
      databaseName: cleanDbName,
      stats,
      realtimeClients: connectedClients.size + sseClients.size,
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/mysql/status - comprehensive diagnostics of traditional Ethio Telecom MySQL hosting
  app.get('/api/mysql/status', async (req, res) => {
    try {
      const diagnostics = await diagnoseMySQLConnection();
      res.json(diagnostics);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to diagnose MySQL' });
    }
  });

  // POST /api/mysql/test - ping test with latency measurement
  app.post('/api/mysql/test', async (req, res) => {
    try {
      const isConnected = await testMySQLConnection();
      const diagnostics = await diagnoseMySQLConnection();
      res.json({ success: isConnected, diagnostics });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Test failed' });
    }
  });

  // POST /api/mysql/sync - full bi-directional push & pull sync with MySQL
  app.post('/api/mysql/sync', async (req, res) => {
    try {
      const syncResult = await serverSyncAllWithMySQL();
      // Broadcast real-time refresh to all connected clients
      broadcastRealtime('DATABASE_SYNCED', { source: 'mysql', timestamp: new Date().toISOString() });
      res.json(syncResult);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'MySQL sync failed' });
    }
  });

  // GET /api/mysql/schema - get raw SQL script for traditional MySQL installation
  app.get('/api/mysql/schema', (req, res) => {
    try {
      const schemaPath = path.join(process.cwd(), 'ethiotelecom_mysql_schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(sql);
      } else {
        res.status(404).send('-- Schema file not found');
      }
    } catch (err: any) {
      res.status(500).send(`-- Error loading schema: ${err.message}`);
    }
  });

  // GET /api/mysql/download-schema - download .sql file attachment
  app.get('/api/mysql/download-schema', (req, res) => {
    const schemaPath = path.join(process.cwd(), 'ethiotelecom_mysql_schema.sql');
    if (fs.existsSync(schemaPath)) {
      res.download(schemaPath, 'ethiotelecom_mysql_schema.sql');
    } else {
      res.status(404).send('File not found');
    }
  });

  // GET /api/projects - fetch all non-deleted projects
  app.get('/api/projects', async (req, res) => {
    try {
      const result = await serverGetProjects();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch projects' });
    }
  });

  // POST /api/projects/sync - save / upsert a project in database & broadcast real-time
  app.post('/api/projects/sync', async (req, res) => {
    try {
      const { project } = req.body;
      if (!project || !project.id) {
        return res.status(400).json({ error: 'Invalid project payload: ID required' });
      }

      const result = await serverSaveProject(project);

      // Instant real-time broadcast across all active devices and locations
      broadcastRealtime('PROJECT_UPDATED', project);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save project' });
    }
  });

  // DELETE /api/projects/:id - permanently delete a project in database & broadcast
  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { projectName, deletedBy } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Project ID required' });

      const result = await serverDeleteProject(id, projectName, deletedBy);

      // Instant real-time broadcast of deletion event
      broadcastRealtime('PROJECT_DELETED', { id, projectName });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete project' });
    }
  });

  // GET /api/users - fetch all users from database
  app.get('/api/users', async (req, res) => {
    try {
      const users = await serverGetUsers();
      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch users' });
    }
  });

  // GET /api/external/users - proxy external ERA dashboard user API
  app.get('/api/external/users', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch('https://eradashboard.com.et/api.php?action=get_users', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return res.json({ status: 'notice', data: [], message: `HTTP ${response.status}` });
      }
      const result = await response.json();
      res.json(result);
    } catch (err: any) {
      res.json({ status: 'notice', data: [], message: err.message || 'External endpoint unreachable' });
    }
  });

  // POST /api/external/login - proxy login credentials to external PHP API
  app.post('/api/external/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('https://eradashboard.com.et/api.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const result = await response.json();
      res.json(result);
    } catch (err: any) {
      res.json({ status: 'error', message: err.message || 'Error connecting to API' });
    }
  });

  // POST /api/users/sync - save / upsert users in database & broadcast real-time
  app.post('/api/users/sync', async (req, res) => {
    try {
      const { user, users } = req.body;
      const userList = users ? users : (user ? [user] : []);
      if (!Array.isArray(userList) || userList.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      await serverSaveUsers(userList);

      // Broadcast real-time user update to all sessions
      broadcastRealtime('USERS_UPDATED', userList);

      res.json({ success: true, count: userList.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save users' });
    }
  });

  // DELETE /api/users/:username - delete user in database & broadcast
  app.delete('/api/users/:username', async (req, res) => {
    try {
      const { username } = req.params;
      if (!username) return res.status(400).json({ error: 'Username required' });

      await serverDeleteUser(username);

      broadcastRealtime('USERS_UPDATED', { deletedUsername: username });

      res.json({ success: true, username });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  });

  // GET /api/approvals - fetch approvals
  app.get('/api/approvals', async (req, res) => {
    try {
      const approvals = await serverGetApprovals();
      res.json({ approvals });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch approvals' });
    }
  });

  // POST /api/approvals/sync - sync approvals list & broadcast
  app.post('/api/approvals/sync', async (req, res) => {
    try {
      const { approvals } = req.body;
      if (Array.isArray(approvals)) {
        await serverSaveApprovals(approvals);
        broadcastRealtime('APPROVALS_UPDATED', approvals);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync approvals' });
    }
  });

  // GET /api/config - fetch config items
  app.get('/api/config', async (req, res) => {
    try {
      const config = await serverGetConfig();
      res.json({ config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch config' });
    }
  });

  // POST /api/config/sync - sync config & broadcast
  app.post('/api/config/sync', async (req, res) => {
    try {
      const { key, data } = req.body;
      if (!key) return res.status(400).json({ error: 'Config key required' });

      await serverSaveConfig(key, data);

      broadcastRealtime('CONFIG_UPDATED', { [key]: data });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save config' });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [MySQL & Real-time Server] Express + WebSockets running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
