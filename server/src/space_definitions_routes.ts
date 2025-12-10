import type { Request, Response } from 'express';
import express from 'express';
import { getDbPool } from './db.js';
import type { PublicUser } from './auth_service.js';
import { attachUserFromToken, requireAuth } from './auth_routes.js';
import {
  createSpaceDefinition,
  listSpaceDefinitions,
} from './definitions_service.js';

type AuthedRequest = Request & { user?: PublicUser };

type SpaceRecord = {
  id: number;
  user_id: number;
};

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

router.get('/characters', async (req: AuthedRequest, res: Response) => {
  const space = await loadOwnedSpaceOr404(req, res);
  if (!space) {
    return;
  }

  const definitions = await listSpaceDefinitions(space.id, 'character');
  res.status(200).json({ characters: definitions });
});

router.post('/characters', async (req: AuthedRequest, res: Response) => {
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

  try {
    const definition = await createSpaceDefinition(
      space.id,
      'character',
      name.trim(),
      description ?? null,
    );
    res.status(201).json({ character: definition });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[definitions] Create character error:', error);
    res.status(500).json({ error: 'CHARACTER_CREATE_FAILED' });
  }
});

router.get('/scenes', async (req: AuthedRequest, res: Response) => {
  const space = await loadOwnedSpaceOr404(req, res);
  if (!space) {
    return;
  }

  const definitions = await listSpaceDefinitions(space.id, 'scene');
  res.status(200).json({ scenes: definitions });
});

router.post('/scenes', async (req: AuthedRequest, res: Response) => {
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

  try {
    const definition = await createSpaceDefinition(
      space.id,
      'scene',
      name.trim(),
      description ?? null,
    );
    res.status(201).json({ scene: definition });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[definitions] Create scene error:', error);
    res.status(500).json({ error: 'SCENE_CREATE_FAILED' });
  }
});

export { router as spaceDefinitionsRouter };

