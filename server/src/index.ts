import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { testDbConnection } from './db.js';
import { authRouter } from './auth_routes.js';
import { spacesRouter } from './spaces_routes.js';
import { projectsRouter } from './projects_routes.js';
import { spaceDefinitionsRouter } from './space_definitions_routes.js';
import { projectImportRouter } from './project_import_routes.js';
import { projectDefinitionsRouter } from './project_definitions_routes.js';
import {
  projectTasksRouter,
  taskRenderRouter,
  renderedAssetsRouter,
} from './tasks_routes.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

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

app.use('/api/auth', authRouter);
app.use('/api/spaces', spacesRouter);
app.use('/api/spaces/:spaceId/projects', projectsRouter);
app.use('/api/spaces/:spaceId', spaceDefinitionsRouter);
app.use('/api/projects/:projectId/import', projectImportRouter);
app.use('/api/projects/:projectId/definitions', projectDefinitionsRouter);
app.use('/api/projects/:projectId', projectTasksRouter);
app.use('/api/tasks/:taskId', taskRenderRouter);
app.use('/api/rendered-assets', renderedAssetsRouter);

const port = Number(process.env.PORT) || 6000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[studio-server] listening on port ${port}`);
});
