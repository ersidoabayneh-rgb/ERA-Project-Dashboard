import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getMySQLPool, initMySQLTables, testMySQLConnection } from './src/lib/mysql.js';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Track active real-time WebSocket clients
  const connectedClients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    broadcastPresence();

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'JOIN') {
          broadcastPresence();
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
    const payload = JSON.stringify({
      type: 'PRESENCE_UPDATE',
      payload: { activeUsers: connectedClients.size },
      timestamp: new Date().toISOString()
    });
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  function broadcastRealtime(type: string, payload: any) {
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // Middleware for parsing JSON payloads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize MySQL database schema
  await initMySQLTables().catch(() => false);

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    const isConn = await testMySQLConnection();
    res.json({
      status: 'ok',
      database: 'mysql',
      connected: isConn,
      realtimeClients: connectedClients.size,
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/projects - fetch all non-deleted projects
  app.get('/api/projects', async (req, res) => {
    try {
      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      const [delRows]: any = await pool.query('SELECT id FROM deleted_projects');
      const deletedIds = new Set((delRows || []).map((r: any) => r.id));

      const [rows]: any = await pool.query('SELECT id, name, data, last_modified_at FROM projects');
      const projects = (rows || [])
        .filter((r: any) => !deletedIds.has(r.id))
        .map((r: any) => {
          try {
            return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      res.json({ projects, deletedIds: Array.from(deletedIds) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch projects from MySQL' });
    }
  });

  // POST /api/projects/sync - save / upsert a project in MySQL & broadcast real-time
  app.post('/api/projects/sync', async (req, res) => {
    try {
      const { project } = req.body;
      if (!project || !project.id) {
        return res.status(400).json({ error: 'Invalid project payload' });
      }

      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      // Check if project is deleted
      const [delRows]: any = await pool.query('SELECT id FROM deleted_projects WHERE id = ?', [project.id]);
      if (delRows && delRows.length > 0) {
        return res.status(409).json({ error: 'Project has been permanently deleted' });
      }

      const projJson = JSON.stringify(project);
      const projName = project.name || 'Untitled Project';
      const lastMod = project.lastModifiedAt || new Date().toISOString();

      await pool.query(
        `INSERT INTO projects (id, name, data, last_modified_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), data = VALUES(data), last_modified_at = VALUES(last_modified_at)`,
        [project.id, projName, projJson, lastMod]
      );

      // Broadcast real-time update to all active users
      broadcastRealtime('PROJECT_UPDATED', project);

      res.json({ success: true, id: project.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save project to MySQL' });
    }
  });

  // DELETE /api/projects/:id - permanently delete a project in MySQL & broadcast
  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { projectName, deletedBy } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Project ID required' });

      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      const deletedAt = new Date().toISOString();

      // Record tombstone
      await pool.query(
        `INSERT INTO deleted_projects (id, project_name, deleted_by, deleted_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE project_name = VALUES(project_name), deleted_by = VALUES(deleted_by), deleted_at = VALUES(deleted_at)`,
        [id, projectName || id, deletedBy || 'system', deletedAt]
      );

      // Remove from active projects table
      await pool.query('DELETE FROM projects WHERE id = ?', [id]);

      // Broadcast real-time deletion event
      broadcastRealtime('PROJECT_DELETED', { id, projectName });

      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete project in MySQL' });
    }
  });

  // GET /api/users - fetch all users from MySQL
  app.get('/api/users', async (req, res) => {
    try {
      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      const [rows]: any = await pool.query('SELECT username, data FROM users');
      const users = (rows || [])
        .map((r: any) => {
          try {
            return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch users' });
    }
  });

  // POST /api/users/sync - save / upsert users in MySQL & broadcast real-time
  app.post('/api/users/sync', async (req, res) => {
    try {
      const { user, users } = req.body;
      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      const userList = users ? users : (user ? [user] : []);
      for (const u of userList) {
        if (!u || !u.username) continue;
        const uJson = JSON.stringify(u);
        await pool.query(
          `INSERT INTO users (username, full_name, role, data)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role), data = VALUES(data)`,
          [u.username, u.fullName || u.username, u.role || 'user', uJson]
        );
      }

      // Broadcast real-time user update
      broadcastRealtime('USERS_UPDATED', userList);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save user in MySQL' });
    }
  });

  // DELETE /api/users/:username - delete user in MySQL & broadcast
  app.delete('/api/users/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      await pool.query('DELETE FROM users WHERE username = ?', [username]);

      broadcastRealtime('USERS_UPDATED', { deletedUsername: username });

      res.json({ success: true, username });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete user in MySQL' });
    }
  });

  // GET /api/approvals - fetch approvals
  app.get('/api/approvals', async (req, res) => {
    try {
      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      const [rows]: any = await pool.query('SELECT id, data FROM approvals');
      const approvals = (rows || [])
        .map((r: any) => {
          try {
            return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      res.json({ approvals });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch approvals' });
    }
  });

  // POST /api/approvals/sync - sync approvals list & broadcast
  app.post('/api/approvals/sync', async (req, res) => {
    try {
      const { approvals } = req.body;
      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      if (Array.isArray(approvals)) {
        for (const appr of approvals) {
          if (!appr || !appr.id) continue;
          const aJson = JSON.stringify(appr);
          await pool.query(
            `INSERT INTO approvals (id, project_id, section, status, data)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE project_id = VALUES(project_id), section = VALUES(section), status = VALUES(status), data = VALUES(data)`,
            [appr.id, appr.projectId || '', appr.section || '', appr.status || '', aJson]
          );
        }
      }

      broadcastRealtime('APPROVALS_UPDATED', approvals);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to sync approvals' });
    }
  });

  // GET /api/config - fetch config items
  app.get('/api/config', async (req, res) => {
    try {
      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      const [rows]: any = await pool.query('SELECT config_key, data FROM config');
      const result: Record<string, any> = {};
      (rows || []).forEach((r: any) => {
        try {
          result[r.config_key] = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        } catch {}
      });

      res.json({ config: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch config' });
    }
  });

  // POST /api/config/sync - sync config & broadcast
  app.post('/api/config/sync', async (req, res) => {
    try {
      const { key, data } = req.body;
      if (!key) return res.status(400).json({ error: 'Config key required' });

      const pool = getMySQLPool();
      if (!pool) return res.status(503).json({ error: 'MySQL database pool unavailable' });

      const dJson = JSON.stringify(data);
      await pool.query(
        `INSERT INTO config (config_key, data)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [key, dJson]
      );

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
