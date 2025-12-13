import { getDbPool } from './db.js';

export type SpaceAssetRecord = {
  id: number;
  space_id: number;
  name: string;
  type: string;
  file_key: string;
  file_url: string;
  metadata: unknown | null;
  created_at: Date;
  updated_at: Date;
};

export const listSpaceAssets = async (
  spaceId: number,
  type?: string,
): Promise<SpaceAssetRecord[]> => {
  const db = getDbPool();

  if (type && type.trim().length > 0) {
    const [rows] = await db.query(
      'SELECT * FROM space_assets WHERE space_id = ? AND type = ? ORDER BY created_at DESC',
      [spaceId, type],
    );
    return rows as SpaceAssetRecord[];
  }

  const [rows] = await db.query(
    'SELECT * FROM space_assets WHERE space_id = ? ORDER BY created_at DESC',
    [spaceId],
  );
  return rows as SpaceAssetRecord[];
};

export const createSpaceAsset = async (params: {
  spaceId: number;
  name: string;
  type: string;
  fileKey: string;
  fileUrl: string;
  metadata?: unknown;
}): Promise<SpaceAssetRecord | null> => {
  const db = getDbPool();
  const { spaceId, name, type, fileKey, fileUrl, metadata } = params;

  const [result] = await db.query(
    `INSERT INTO space_assets (space_id, name, type, file_key, file_url, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      spaceId,
      name,
      type,
      fileKey,
      fileUrl,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );

  const insertResult = result as { insertId?: number };
  const id = insertResult.insertId;
  if (!id) {
    return null;
  }

  const [rows] = await db.query(
    'SELECT * FROM space_assets WHERE id = ? AND space_id = ? LIMIT 1',
    [id, spaceId],
  );
  const list = rows as SpaceAssetRecord[];
  return list[0] ?? null;
};

export const deleteSpaceAsset = async (
  spaceId: number,
  assetId: number,
): Promise<boolean> => {
  const db = getDbPool();
  const [result] = await db.query(
    'DELETE FROM space_assets WHERE id = ? AND space_id = ?',
    [assetId, spaceId],
  );
  const info = result as { affectedRows?: number };
  return (info.affectedRows ?? 0) > 0;
};

export const getSpaceAssetsByIds = async (
  spaceId: number,
  assetIds: number[],
): Promise<SpaceAssetRecord[]> => {
  if (assetIds.length === 0) {
    return [];
  }

  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT * FROM space_assets WHERE space_id = ? AND id IN (?)',
    [spaceId, assetIds],
  );
  return rows as SpaceAssetRecord[];
};

