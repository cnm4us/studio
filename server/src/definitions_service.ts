import { getDbPool } from './db.js';

export type DefinitionType = 'character' | 'scene';
export type DefinitionScope = 'space' | 'project';

export type DefinitionRecord = {
  id: number;
  type: DefinitionType;
  scope: DefinitionScope;
  space_id: number | null;
  project_id: number | null;
  root_id: number | null;
  parent_id: number | null;
  name: string;
  description: string | null;
  state: 'draft' | 'canonical' | 'deprecated' | 'archived';
  metadata: unknown | null;
  created_at: Date;
  updated_at: Date;
};

export type PublicDefinition = {
  id: number;
  type: DefinitionType;
  scope: DefinitionScope;
  name: string;
  description: string | null;
  state: DefinitionRecord['state'];
  rootId: number | null;
  parentId: number | null;
  createdAt: Date;
};

const mapDefinitionToPublic = (row: DefinitionRecord): PublicDefinition => ({
  id: row.id,
  type: row.type,
  scope: row.scope,
  name: row.name,
  description: row.description,
  state: row.state,
  rootId: row.root_id,
  parentId: row.parent_id,
  createdAt: row.created_at,
});

export const listSpaceDefinitions = async (
  spaceId: number,
  type: DefinitionType,
): Promise<PublicDefinition[]> => {
  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT * FROM definitions WHERE space_id = ? AND scope = ? AND type = ? ORDER BY created_at DESC',
    [spaceId, 'space', type],
  );
  const list = rows as DefinitionRecord[];
  return list.map(mapDefinitionToPublic);
};

export const createSpaceDefinition = async (
  spaceId: number,
  type: DefinitionType,
  name: string,
  description: string | null,
): Promise<PublicDefinition> => {
  const db = getDbPool();

  const [result] = await db.query(
    'INSERT INTO definitions (type, scope, space_id, name, description, state) VALUES (?, ?, ?, ?, ?, ?)',
    [type, 'space', spaceId, name, description, 'draft'],
  );

  const insertResult = result as { insertId?: number };
  const id = insertResult.insertId;

  if (!id) {
    throw new Error('DEFINITION_CREATE_FAILED');
  }

  // Set root_id = id for the first creation.
  await db.query('UPDATE definitions SET root_id = ? WHERE id = ?', [id, id]);

  const [rows] = await db.query(
    'SELECT * FROM definitions WHERE id = ? LIMIT 1',
    [id],
  );
  const list = rows as DefinitionRecord[];
  if (list.length === 0) {
    throw new Error('DEFINITION_LOAD_FAILED');
  }

  return mapDefinitionToPublic(list[0]);
};

export const cloneDefinitionToProject = async (
  sourceId: number,
  spaceId: number,
  projectId: number,
): Promise<PublicDefinition> => {
  const db = getDbPool();

  const [rows] = await db.query(
    'SELECT * FROM definitions WHERE id = ? AND space_id = ? AND scope = ? LIMIT 1',
    [sourceId, spaceId, 'space'],
  );
  const list = rows as DefinitionRecord[];

  if (list.length === 0) {
    throw new Error('DEFINITION_NOT_FOUND_FOR_SPACE');
  }

  const source = list[0];
  const rootId = source.root_id ?? source.id;

  const [insert] = await db.query(
    'INSERT INTO definitions (type, scope, project_id, root_id, parent_id, name, description, state, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      source.type,
      'project',
      projectId,
      rootId,
      source.id,
      source.name,
      source.description,
      source.state,
      source.metadata ?? null,
    ],
  );

  const insertResult = insert as { insertId?: number };
  const id = insertResult.insertId;

  if (!id) {
    throw new Error('DEFINITION_CLONE_FAILED');
  }

  const [clonedRows] = await db.query(
    'SELECT * FROM definitions WHERE id = ? LIMIT 1',
    [id],
  );
  const clonedList = clonedRows as DefinitionRecord[];
  if (clonedList.length === 0) {
    throw new Error('DEFINITION_CLONE_LOAD_FAILED');
  }

  return mapDefinitionToPublic(clonedList[0]);
};

