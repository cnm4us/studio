import type { Request, Response } from 'express';
import express from 'express';
import { getDbPool } from './db.js';
import type { PublicUser } from './auth_service.js';
import { attachUserFromToken, requireAuth } from './auth_routes.js';

type AuthedRequest = Request & { user?: PublicUser };

type SpaceRecord = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: Date;
};

const mapSpace = (row: SpaceRecord) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
});

const router = express.Router();

router.use(attachUserFromToken as any);
router.use(requireAuth as any);

router.get('/', async (req: AuthedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT id, user_id, name, description, created_at FROM spaces WHERE user_id = ? ORDER BY created_at DESC',
    [user.id],
  );

  const list = rows as SpaceRecord[];
  res.status(200).json({ spaces: list.map(mapSpace) });
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return;
  }

  const { name, description } = req.body as {
    name?: string;
    description?: string | null;
  };

  if (!name || name.trim().length === 0) {
    res.status(400).json({ error: 'NAME_REQUIRED' });
    return;
  }

  const trimmedName = name.trim();

  try {
    const db = getDbPool();
    const [result] = await db.query(
      'INSERT INTO spaces (user_id, name, description) VALUES (?, ?, ?)',
      [user.id, trimmedName, description ?? null],
    );

    const insertResult = result as { insertId?: number };
    const id = insertResult.insertId;

    if (!id) {
      res.status(500).json({ error: 'SPACE_CREATE_FAILED' });
      return;
    }

    const [rows] = await db.query(
      'SELECT id, user_id, name, description, created_at FROM spaces WHERE id = ? AND user_id = ? LIMIT 1',
      [id, user.id],
    );

    const list = rows as SpaceRecord[];
    if (list.length === 0) {
      res.status(500).json({ error: 'SPACE_LOAD_FAILED' });
      return;
    }

    const space = mapSpace(list[0]);
    res.status(201).json({ space });
  } catch (error: any) {
    if (error && typeof error === 'object' && (error as any).code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'SPACE_NAME_TAKEN' });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('[spaces] Create space error:', error);
    res.status(500).json({ error: 'SPACE_CREATE_FAILED' });
  }
});

export { router as spacesRouter };

