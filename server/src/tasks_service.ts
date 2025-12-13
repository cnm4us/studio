import { getDbPool } from './db.js';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export type TaskRecord = {
  id: number;
  project_id: number | null;
  space_id: number | null;
  name: string;
  description: string | null;
  prompt: string | null;
  status: TaskStatus;
  created_at: Date;
  updated_at: Date;
};

export type RenderedAssetRecord = {
  id: number;
  project_id: number | null;
  space_id: number | null;
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
    `INSERT INTO tasks (project_id, space_id, name, description, prompt, status)
     SELECT p.id, p.space_id, ?, ?, ?, ?
     FROM projects p
     WHERE p.id = ?
     LIMIT 1`,
    [name, description, prompt, 'pending', projectId],
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

export const createSpaceTask = async (
  spaceId: number,
  name: string,
  description: string | null,
  prompt: string | null,
): Promise<TaskRecord> => {
  const db = getDbPool();

  const [result] = await db.query(
    `INSERT INTO tasks (project_id, space_id, name, description, prompt, status)
     VALUES (NULL, ?, ?, ?, ?, ?)`,
    [spaceId, name, description, prompt, 'pending'],
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

export const listSpaceTasks = async (
  spaceId: number,
): Promise<TaskRecord[]> => {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT *
     FROM tasks
     WHERE space_id = ? AND project_id IS NULL
     ORDER BY created_at DESC`,
    [spaceId],
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

export const listRenderedAssetsBySpace = async (
  spaceId: number,
): Promise<RenderedAssetRecord[]> => {
  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT *
     FROM rendered_assets
     WHERE space_id = ? AND project_id IS NULL
     ORDER BY created_at DESC`,
    [spaceId],
  );
  return rows as RenderedAssetRecord[];
};

export const getRenderedAssetById = async (
  assetId: number,
): Promise<RenderedAssetRecord | null> => {
  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT * FROM rendered_assets WHERE id = ? LIMIT 1',
    [assetId],
  );
  const list = rows as RenderedAssetRecord[];
  if (list.length === 0) {
    return null;
  }
  return list[0];
};

export const updateRenderedAssetState = async (
  assetId: number,
  state: 'draft' | 'approved' | 'archived',
): Promise<void> => {
  const db = getDbPool();
  await db.query('UPDATE rendered_assets SET state = ? WHERE id = ?', [
    state,
    assetId,
  ]);
};


export const updateTaskStatus = async (
  taskId: number,
  status: TaskStatus,
): Promise<void> => {
  const db = getDbPool();
  await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
};

export const deleteTask = async (taskId: number): Promise<void> => {
  const db = getDbPool();
  await db.query('DELETE FROM tasks WHERE id = ?', [taskId]);
};

export const createRenderedAsset = async (
  projectId: number | null,
  spaceId: number | null,
  taskId: number,
  type: string,
  fileKey: string,
  fileUrl: string,
  metadata: unknown,
): Promise<RenderedAssetRecord> => {
  const db = getDbPool();

  const [result] = await db.query(
    `INSERT INTO rendered_assets (project_id, space_id, task_id, type, file_key, file_url, metadata, state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      spaceId,
      taskId,
      type,
      fileKey,
      fileUrl,
      JSON.stringify(metadata),
      'draft',
    ],
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
