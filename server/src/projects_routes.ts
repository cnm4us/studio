import type { Request, Response } from 'express';
import express from 'express';
import { getDbPool } from './db.js';
import type { PublicUser } from './auth_service.js';
import { attachUserFromToken, requireAuth } from './auth_routes.js';

type AuthedRequest = Request & { user?: PublicUser };

type SpaceRecord = {
  id: number;
  user_id: number;
};

type ProjectRecord = {
  id: number;
  space_id: number;
  name: string;
  description: string | null;
  created_at: Date;
};

const mapProject = (row: ProjectRecord) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
});

const router = express.Router({ mergeParams: true });

router.use(attachUserFromToken as any);
router.use(requireAuth as any);

const loadOwnedSpaceOr404 = async (
  req: AuthedRequest,
  res: Response,
): Promise<SpaceRecord | null> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return null;
  }

  const { spaceId } = req.params as { spaceId?: string };
  const numericSpaceId = spaceId ? Number(spaceId) : NaN;
  if (!Number.isFinite(numericSpaceId) || numericSpaceId <= 0) {
    res.status(400).json({ error: 'INVALID_SPACE_ID' });
    return null;
  }

  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT id, user_id FROM spaces WHERE id = ? AND user_id = ? LIMIT 1',
    [numericSpaceId, user.id],
  );
  const list = rows as SpaceRecord[];
  if (list.length === 0) {
    res.status(404).json({ error: 'SPACE_NOT_FOUND' });
    return null;
  }

  return list[0];
};

router.get('/', async (req: AuthedRequest, res: Response) => {
  const space = await loadOwnedSpaceOr404(req, res);
  if (!space) {
    return;
  }

  const db = getDbPool();
  const [rows] = await db.query(
    'SELECT id, space_id, name, description, created_at FROM projects WHERE space_id = ? ORDER BY created_at DESC',
    [space.id],
  );

  const list = rows as ProjectRecord[];
  res.status(200).json({ projects: list.map(mapProject) });
});

router.post('/', async (req: AuthedRequest, res: Response) => {
  const space = await loadOwnedSpaceOr404(req, res);
  if (!space) {
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
      'INSERT INTO projects (space_id, name, description) VALUES (?, ?, ?)',
      [space.id, trimmedName, description ?? null],
    );

    const insertResult = result as { insertId?: number };
    const id = insertResult.insertId;

    if (!id) {
      res.status(500).json({ error: 'PROJECT_CREATE_FAILED' });
      return;
    }

    const [rows] = await db.query(
      'SELECT id, space_id, name, description, created_at FROM projects WHERE id = ? AND space_id = ? LIMIT 1',
      [id, space.id],
    );

    const list = rows as ProjectRecord[];
    if (list.length === 0) {
      res.status(500).json({ error: 'PROJECT_LOAD_FAILED' });
      return;
    }

    const project = mapProject(list[0]);
    res.status(201).json({ project });
  } catch (error: any) {
    if (error && typeof error === 'object' && (error as any).code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'PROJECT_NAME_TAKEN' });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('[projects] Create project error:', error);
    res.status(500).json({ error: 'PROJECT_CREATE_FAILED' });
  }
});

export { router as projectsRouter };

