import mysql from 'mysql2/promise';

export interface MySQLDiagnostics {
  connected: boolean;
  host: string;
  port: number;
  user: string;
  database: string;
  socket?: string;
  charset: string;
  timezone: string;
  latencyMs: number;
  lastTestedAt: string;
  errorDetails?: string;
  recommendation?: string;
  tableStats?: {
    projects: number;
    users: number;
    approvals: number;
    config: number;
    deletedProjects: number;
  };
}

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastDiagnosticError = '';
let lastTestedTimestamp = '';
let lastLatencyMs = 0;

/**
 * Creates or retrieves the singleton MySQL connection pool configured for
 * Ethio Telecom web hosting (cPanel / Linux / MySQL 5.7+ & 8.0+).
 */
export function getMySQLPool(): mysql.Pool | null {
  if (pool) return pool;

  const rawUrl = (process.env.DATABASE_URL || process.env.MYSQL_URL || '').trim();
  const host = (process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost').trim();
  const port = parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
  const user = (process.env.MYSQL_USER || process.env.MYSQLUSER || 'root').trim();
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
  const database = (process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'era_dashboard').trim();
  const socketPath = (process.env.MYSQL_SOCKET || '').trim();
  const sslMode = (process.env.MYSQL_SSL || 'false').toLowerCase() === 'true';
  const charset = process.env.MYSQL_CHARSET || 'utf8mb4';
  const timezone = process.env.MYSQL_TIMEZONE || '+03:00';

  // 1. Connection string URL support
  if (rawUrl) {
    try {
      if (rawUrl.startsWith('mysql://') || rawUrl.startsWith('mysqls://') || rawUrl.startsWith('mariadb://')) {
        pool = mysql.createPool({
          uri: rawUrl,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 8000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
          charset: 'utf8mb4',
          timezone: '+03:00'
        });
        return pool;
      }
    } catch (urlErr: any) {
      console.warn('[Ethio Telecom MySQL]: Provided DATABASE_URL was invalid. Falling back to discrete parameters.');
    }
  }

  // 2. Discrete parameters configuration (traditional cPanel / LAMP stack)
  try {
    const poolConfig: mysql.PoolOptions = {
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      charset: 'utf8mb4',
      timezone: '+03:00',
    };

    if (socketPath) {
      poolConfig.socketPath = socketPath;
    } else {
      poolConfig.host = host;
      poolConfig.port = isNaN(port) ? 3306 : port;
    }

    poolConfig.user = user;
    poolConfig.password = password;
    poolConfig.database = database;

    if (sslMode) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = mysql.createPool(poolConfig);
    return pool;
  } catch (err: any) {
    lastDiagnosticError = err?.message || String(err);
    console.warn('[Ethio Telecom MySQL Pool Creation Failed]:', lastDiagnosticError);
    return null;
  }
}

/**
 * Resets the pool instance so updated credentials can take effect immediately
 */
export function resetMySQLPool(): void {
  if (pool) {
    try {
      pool.end().catch(() => {});
    } catch (e) {}
    pool = null;
  }
  isConnected = false;
}

/**
 * Runs a quick ping test against the configured MySQL server.
 */
export async function testMySQLConnection(): Promise<boolean> {
  const myPool = getMySQLPool();
  if (!myPool) {
    isConnected = false;
    return false;
  }

  const start = Date.now();
  try {
    const conn = await myPool.getConnection();
    await conn.ping();
    conn.release();
    lastLatencyMs = Date.now() - start;
    isConnected = true;
    lastDiagnosticError = '';
    lastTestedTimestamp = new Date().toISOString();
    return true;
  } catch (err: any) {
    lastLatencyMs = Date.now() - start;
    lastDiagnosticError = err?.message || String(err);
    lastTestedTimestamp = new Date().toISOString();
    isConnected = false;
    return false;
  }
}

/**
 * Comprehensive diagnostic check providing table metrics and actionable
 * error advice for Ethio Telecom cPanel hosting.
 */
export async function diagnoseMySQLConnection(): Promise<MySQLDiagnostics> {
  const host = (process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost').trim();
  const port = parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
  const user = (process.env.MYSQL_USER || process.env.MYSQLUSER || 'root').trim();
  const database = (process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'era_dashboard').trim();
  const socketPath = (process.env.MYSQL_SOCKET || '').trim();

  const baseResult: MySQLDiagnostics = {
    connected: false,
    host,
    port: isNaN(port) ? 3306 : port,
    user,
    database,
    socket: socketPath || undefined,
    charset: 'utf8mb4',
    timezone: '+03:00 (East Africa Time)',
    latencyMs: 0,
    lastTestedAt: new Date().toISOString()
  };

  const myPool = getMySQLPool();
  if (!myPool) {
    baseResult.errorDetails = lastDiagnosticError || 'Failed to initialize MySQL driver pool';
    baseResult.recommendation = 'Check .env or environment variables: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.';
    return baseResult;
  }

  const start = Date.now();
  try {
    const conn = await myPool.getConnection();
    await conn.ping();
    baseResult.latencyMs = Date.now() - start;
    baseResult.connected = true;
    isConnected = true;

    // Fetch table stats
    const tableStats = {
      projects: 0,
      users: 0,
      approvals: 0,
      config: 0,
      deletedProjects: 0
    };

    try {
      const [projRows]: any = await conn.query('SELECT COUNT(*) as c FROM projects');
      tableStats.projects = projRows[0]?.c || 0;
    } catch {}

    try {
      const [userRows]: any = await conn.query('SELECT COUNT(*) as c FROM users');
      tableStats.users = userRows[0]?.c || 0;
    } catch {}

    try {
      const [apprRows]: any = await conn.query('SELECT COUNT(*) as c FROM approvals');
      tableStats.approvals = apprRows[0]?.c || 0;
    } catch {}

    try {
      const [cfgRows]: any = await conn.query('SELECT COUNT(*) as c FROM config');
      tableStats.config = cfgRows[0]?.c || 0;
    } catch {}

    try {
      const [delRows]: any = await conn.query('SELECT COUNT(*) as c FROM deleted_projects');
      tableStats.deletedProjects = delRows[0]?.c || 0;
    } catch {}

    conn.release();
    baseResult.tableStats = tableStats;
    return baseResult;
  } catch (err: any) {
    baseResult.latencyMs = Date.now() - start;
    baseResult.connected = false;
    isConnected = false;
    const msg = err?.message || String(err);
    baseResult.errorDetails = msg;

    // Provide actionable cPanel advice based on error codes
    if (msg.includes('ER_ACCESS_DENIED_ERROR') || msg.includes('Access denied')) {
      baseResult.recommendation =
        'Access Denied: Verify MYSQL_USER and MYSQL_PASSWORD in cPanel -> MySQL Databases. Ensure the user is added to the database with ALL PRIVILEGES.';
    } else if (msg.includes('ER_BAD_DB_ERROR') || msg.includes('Unknown database')) {
      baseResult.recommendation =
        `Unknown Database '${database}': Create the database in cPanel -> MySQL Databases, or import /ethiotelecom_mysql_schema.sql in phpMyAdmin.`;
    } else if (msg.includes('ECONNREFUSED')) {
      baseResult.recommendation =
        `Connection Refused on ${host}:${port}: If running on the Ethio Telecom server, set MYSQL_HOST=localhost. If connecting from outside, enable port 3306 in cPanel Remote MySQL.`;
    } else if (msg.includes('ETIMEDOUT') || msg.includes('Operation timed out')) {
      baseResult.recommendation =
        `Connection Timed Out to ${host}: Ethio Telecom firewall is blocking incoming connections to port 3306. Whitelist your current IP address in cPanel -> Remote MySQL.`;
    } else {
      baseResult.recommendation =
        'Verify MySQL server is running on Ethio Telecom hosting and check credentials in cPanel.';
    }

    return baseResult;
  }
}

/**
 * Initializes tables in MySQL with full schema compatible with Ethio Telecom hosting.
 */
export async function initMySQLTables(): Promise<boolean> {
  const myPool = getMySQLPool();
  if (!myPool) return false;

  try {
    const conn = await myPool.getConnection();

    // 1. Projects table with full indexed columns + JSON data payload
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(120) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        program_directorate VARCHAR(120),
        pmo VARCHAR(120),
        contractor VARCHAR(255),
        consultant VARCHAR(255),
        physical_progress DECIMAL(6,2) DEFAULT 0.00,
        financial_progress DECIMAL(6,2) DEFAULT 0.00,
        total_budget DECIMAL(18,2) DEFAULT 0.00,
        disbursed_amount DECIMAL(18,2) DEFAULT 0.00,
        status VARCHAR(60) DEFAULT 'Active',
        last_modified_section VARCHAR(120),
        last_modified_at VARCHAR(100),
        data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_program (program_directorate),
        INDEX idx_status (status),
        INDEX idx_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(120) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        password VARCHAR(255),
        role VARCHAR(60) NOT NULL DEFAULT 'viewer',
        email VARCHAR(255),
        accessible_projects TEXT,
        data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Approvals table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id VARCHAR(120) PRIMARY KEY,
        project_id VARCHAR(120) NOT NULL,
        section VARCHAR(255) NOT NULL,
        status VARCHAR(60) NOT NULL DEFAULT 'pending',
        requested_by VARCHAR(120),
        approved_by VARCHAR(120),
        data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_project (project_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Config table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS config (
        config_key VARCHAR(120) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Deleted projects tombstone table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS deleted_projects (
        id VARCHAR(120) PRIMARY KEY,
        project_name VARCHAR(255),
        deleted_by VARCHAR(120),
        deleted_at VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Sync audit logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        record_type VARCHAR(60) NOT NULL,
        record_id VARCHAR(120) NOT NULL,
        action VARCHAR(60) NOT NULL,
        author VARCHAR(120),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type_id (record_type, record_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    conn.release();
    console.log('✅ [Ethio Telecom MySQL Database Engine]: All traditional tables verified and initialized successfully.');
    isConnected = true;
    return true;
  } catch (err: any) {
    console.warn('[Ethio Telecom MySQL Notice]: Could not auto-initialize tables:', err?.message || err);
    isConnected = false;
    return false;
  }
}

export function isMySQLConnected(): boolean {
  return isConnected;
}
