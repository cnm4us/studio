import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDbConnection } from './db.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health/db', async (_req, res) => {
  try {
    await testDbConnection();
    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[health] DB connection check failed:', error);
    res.status(500).json({ status: 'error', message: 'DB_CONNECTION_FAILED' });
  }
});

app.get('/api/spaces', (_req, res) => {
  res.status(200).json({ spaces: [] });
});

const port = Number(process.env.PORT) || 6000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[studio-server] listening on port ${port}`);
});

