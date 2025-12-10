import { getDbPool } from './db.js';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TaskRecord = {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  prompt: string | null;
  status: TaskStatus;
  created_at: Date;
  updated_at: Date;
};

export type RenderedAssetRecord = {
  id: number;
  project_id: number;
  task_id: number;
  type: string;
  file_key: string;
  file_url: string;
  metadata: unknown | null;
  state: 'draft' | 'approved' | 'archived';
  created_at: Date;
};

export const createTask = async (
  projectId: number,
  name: string,
  description: string | null,
  prompt: string | null,
): Promise<TaskRecord> => {
  const db = getDbPool();

  const [result] = await db.query(
    'INSERT INTO tasks (project_id, name, description, prompt, status) VALUES (?, ?, ?, ?, ?)',
    [projectId, name, description, prompt, 'pending'],
  );

  const insertResult = result as { insertId?: number };
  const id = insertResult.insertId;
  if (!id) {
    throw new Error('TASK_CREATE_FAILED');
  }

  const [rows] = await db.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [
    id,
  ]);
  const list = rows as TaskRecord[];
  if (list.length === 0) {
    throw new Error('TASK_LOAD_FAILED');
  }

  return list[0];
};

export const listProjectTasks = async (
  projectId: number,
): Promise<TaskRecord[]> => {
  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC',
    [projectId],
  );
  return rows as TaskRecord[];
};

export const listRenderedAssetsByProject = async (
  projectId: number,
): Promise<RenderedAssetRecord[]> => {
  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT * FROM rendered_assets WHERE project_id = ? ORDER BY created_at DESC',
    [projectId],
  );
  return rows as RenderedAssetRecord[];
};


export const updateTaskStatus = async (
  taskId: number,
  status: TaskStatus,
): Promise<void> => {
  const db = getDbPool();
  await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
};

export const createRenderedAsset = async (
  projectId: number,
  taskId: number,
  type: string,
  fileKey: string,
  fileUrl: string,
  metadata: unknown,
): Promise<RenderedAssetRecord> => {
  const db = getDbPool();

  const [result] = await db.query(
    'INSERT INTO rendered_assets (project_id, task_id, type, file_key, file_url, metadata, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [projectId, taskId, type, fileKey, fileUrl, JSON.stringify(metadata), 'draft'],
  );

  const insertResult = result as { insertId?: number };
  const id = insertResult.insertId;
  if (!id) {
    throw new Error('RENDERED_ASSET_CREATE_FAILED');
  }

  const [rows] = await db.query(
    'SELECT * FROM rendered_assets WHERE id = ? LIMIT 1',
    [id],
  );
  const list = rows as RenderedAssetRecord[];
  if (list.length === 0) {
    throw new Error('RENDERED_ASSET_LOAD_FAILED');
  }

  return list[0];
};
