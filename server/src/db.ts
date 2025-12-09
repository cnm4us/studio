import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

let pool: Pool | null = null;

const getDbConfig = () => {
  const host = process.env.DB_HOST ?? '127.0.0.1';
  const portRaw = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const name = process.env.DB_NAME;

  const port = Number.isFinite(Number(portRaw)) ? Number(portRaw) : 3306;

  if (!user || !name) {
    throw new Error('DB_USER and DB_NAME must be set in environment variables.');
  }

  return { host, port, user, password, name };
};

export const getDbPool = (): Pool => {
  if (!pool) {
    const cfg = getDbConfig();
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[db] Created connection pool to ${cfg.host}:${cfg.port}/${cfg.name}`,
    );
  }

  return pool;
};

export const testDbConnection = async (): Promise<void> => {
  const db = getDbPool();
  const [rows] = await db.query('SELECT 1 AS ping');
  const ping =
    Array.isArray(rows) && rows.length > 0 ? (rows[0] as any).ping : null;
  // eslint-disable-next-line no-console
  console.log('[db] Connection check succeeded; ping =', ping);
};

