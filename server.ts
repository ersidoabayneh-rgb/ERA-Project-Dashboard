import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getMySQLPool, initMySQLTables, testMySQLConnection } from './src/lib/mysql.js';
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
  serverGetDbStats
} from './src/lib/serverDb.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Track active real-time WebSocket clients and SSE response streams
  const connectedClients = new Set<WebSocket>();
  const sseClients = new Set<express.Response>();

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    broadcastPresence();

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'JOIN') {
          broadcastPresence();
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

  // Periodic heartbeat every 15 seconds to keep WebSocket and SSE stream connections active across proxies/Cloud Run
  setInterval(() => {
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
    res.json({
      status: 'ok',
      database: isConn ? 'mysql+server_db' : 'persistent_server_db',
      mysqlConnected: isConn,
      stats,
      realtimeClients: connectedClients.size + sseClients.size,
      timestamp: new Date().toISOString()
    });
  });

  // Dedicated sync status endpoint for rapid polling & delta detection
  app.get('/api/sync/status', (req, res) => {
    const stats = serverGetDbStats();
    res.json({
      status: 'active',
      stats,
      realtimeClients: connectedClients.size + sseClients.size,
      timestamp: new Date().toISOString()
    });
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
