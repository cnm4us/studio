import type { Request, Response } from 'express';
import express from 'express';
import { getDbPool } from './db.js';
import type { PublicUser } from './auth_service.js';
import { attachUserFromToken, requireAuth } from './auth_routes.js';
import {
  getDefinitionById,
  listProjectDefinitions,
} from './definitions_service.js';

type AuthedRequest = Request & { user?: PublicUser };

type ProjectRecord = {
  id: number;
  space_id: number;
};

const router = express.Router({ mergeParams: true });

router.use(attachUserFromToken as any);
router.use(requireAuth as any);

const loadOwnedProjectOr404 = async (
  req: AuthedRequest,
  res: Response,
): Promise<ProjectRecord | null> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return null;
  }

  const { projectId } = req.params as { projectId?: string };
  const numericProjectId = projectId ? Number(projectId) : NaN;
  if (!Number.isFinite(numericProjectId) || numericProjectId <= 0) {
    res.status(400).json({ error: 'INVALID_PROJECT_ID' });
    return null;
  }

  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT p.id, p.space_id
     FROM projects p
     JOIN spaces s ON s.id = p.space_id
     WHERE p.id = ? AND s.user_id = ?
     LIMIT 1`,
    [numericProjectId, user.id],
  );
  const list = rows as ProjectRecord[];
  if (list.length === 0) {
    res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    return null;
  }

  return list[0];
};

router.get(
  '/characters',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const project = await loadOwnedProjectOr404(req, res);
    if (!project) {
      return;
    }

    try {
      const definitions = await listProjectDefinitions(project.id, 'character');
      res.status(200).json({ characters: definitions });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[definitions] List project characters error:', error);
      res.status(500).json({ error: 'PROJECT_CHARACTERS_LIST_FAILED' });
    }
  },
);

router.get(
  '/scenes',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const project = await loadOwnedProjectOr404(req, res);
    if (!project) {
      return;
    }

    try {
      const definitions = await listProjectDefinitions(project.id, 'scene');
      res.status(200).json({ scenes: definitions });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[definitions] List project scenes error:', error);
      res.status(500).json({ error: 'PROJECT_SCENES_LIST_FAILED' });
    }
  },
);

router.get(
  '/styles',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const project = await loadOwnedProjectOr404(req, res);
    if (!project) {
      return;
    }

    try {
      const definitions = await listProjectDefinitions(project.id, 'style');
      res.status(200).json({ styles: definitions });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[definitions] List project styles error:', error);
      res.status(500).json({ error: 'PROJECT_STYLES_LIST_FAILED' });
    }
  },
);

const deleteProjectDefinition = async (
  req: AuthedRequest,
  res: Response,
  type: 'character' | 'scene' | 'style',
): Promise<void> => {
  const project = await loadOwnedProjectOr404(req, res);
  if (!project) {
    return;
  }

  const { definitionId } = req.params as { definitionId?: string };
  const numericDefinitionId = definitionId ? Number(definitionId) : NaN;
  if (!Number.isFinite(numericDefinitionId) || numericDefinitionId <= 0) {
    res.status(400).json({ error: 'INVALID_DEFINITION_ID' });
    return;
  }

  try {
    const def = await getDefinitionById(numericDefinitionId);
    if (
      !def ||
      def.scope !== 'project' ||
      def.project_id !== project.id ||
      def.type !== type
    ) {
      res.status(404).json({ error: 'DEFINITION_NOT_FOUND_FOR_PROJECT' });
      return;
    }

    const db = getDbPool();
    await db.query('DELETE FROM definitions WHERE id = ? LIMIT 1', [
      numericDefinitionId,
    ]);

    res.status(204).end();
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      '[definitions] Delete project definition error:',
      error,
    );
    res.status(500).json({ error: 'PROJECT_DEFINITION_DELETE_FAILED' });
  }
};

router.delete(
  '/characters/:definitionId',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    await deleteProjectDefinition(req, res, 'character');
  },
);

router.delete(
  '/scenes/:definitionId',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    await deleteProjectDefinition(req, res, 'scene');
  },
);

router.delete(
  '/styles/:definitionId',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    await deleteProjectDefinition(req, res, 'style');
  },
);

export { router as projectDefinitionsRouter };
