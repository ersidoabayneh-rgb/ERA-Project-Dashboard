import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let isConnected = false;

export function getMySQLPool(): mysql.Pool | null {
  if (pool) return pool;

  const rawUrl = (process.env.DATABASE_URL || process.env.MYSQL_URL || '').trim();
  const host = (process.env.MYSQL_HOST || process.env.MYSQLHOST || 'mysql-db01.remote').trim();
  const port = parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || '31636', 10);
  const user = (process.env.MYSQL_USER || process.env.MYSQLUSER || 'root').trim();
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
  const database = (process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'era_dashboard').trim();

  // Try parsing connection URL if valid
  if (rawUrl) {
    try {
      if (rawUrl.startsWith('mysql://') || rawUrl.startsWith('mysqls://') || rawUrl.startsWith('mariadb://')) {
        pool = mysql.createPool(rawUrl);
        return pool;
      }
    } catch (urlErr) {
      console.warn('[MySQL Config Notice]: Provided DATABASE_URL/MYSQL_URL was invalid. Falling back to host/user parameters.');
    }
  }

  // Fallback to object configuration
  try {
    pool = mysql.createPool({
      host: host || 'mysql-db01.remote',
      port: isNaN(port) ? 31636 : port,
      user: user || 'root',
      password,
      database: database || 'era_dashboard',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
    });
    return pool;
  } catch (err: any) {
    console.warn('[MySQL Initialization Notice]: Could not create MySQL connection pool:', err?.message || err);
    return null;
  }
}

export async function testMySQLConnection(): Promise<boolean> {
  const myPool = getMySQLPool();
  if (!myPool) return false;

  try {
    const conn = await myPool.getConnection();
    await conn.ping();
    conn.release();
    isConnected = true;
    return true;
  } catch (err: any) {
    console.warn('[MySQL Connection Notice]: MySQL database server is offline or unreachable:', err?.message || err);
    isConnected = false;
    return false;
  }
}

export async function initMySQLTables(): Promise<boolean> {
  const myPool = getMySQLPool();
  if (!myPool) return false;

  try {
    const conn = await myPool.getConnection();
    
    // Create projects table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(120) PRIMARY KEY,
        name VARCHAR(255),
        data LONGTEXT NOT NULL,
        last_modified_at VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(120) PRIMARY KEY,
        full_name VARCHAR(255),
        role VARCHAR(100),
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create approvals table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        id VARCHAR(120) PRIMARY KEY,
        project_id VARCHAR(120),
        section VARCHAR(255),
        status VARCHAR(100),
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create config table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS config (
        config_key VARCHAR(120) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Create deleted_projects tombstone table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS deleted_projects (
        id VARCHAR(120) PRIMARY KEY,
        project_name VARCHAR(255),
        deleted_by VARCHAR(120),
        deleted_at VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    conn.release();
    console.log('✅ [MySQL Database Engine]: MySQL tables initialized successfully.');
    isConnected = true;
    return true;
  } catch (err: any) {
    console.warn('[MySQL Table Init Notice]: MySQL server offline or unconfigured. App running in local/cached mode.');
    isConnected = false;
    return false;
  }
}

export function isMySQLConnected(): boolean {
  return isConnected;
}
