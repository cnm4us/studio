import type { Request, Response } from 'express';
import express from 'express';
import { getDbPool } from './db.js';
import type { PublicUser } from './auth_service.js';
import { attachUserFromToken, requireAuth } from './auth_routes.js';
import { cloneDefinitionToProject } from './definitions_service.js';

type AuthedRequest = Request & { user?: PublicUser };

type ProjectRecord = {
  id: number;
  space_id: number;
};

type SpaceRecord = {
  id: number;
  user_id: number;
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
  const list = rows as (ProjectRecord & { user_id: number })[];
  if (list.length === 0) {
    res.status(404).json({ error: 'PROJECT_NOT_FOUND' });
    return null;
  }

  return { id: list[0].id, space_id: list[0].space_id };
};

router.post('/', async (req: AuthedRequest, res: Response) => {
  const project = await loadOwnedProjectOr404(req, res);
  if (!project) {
    return;
  }

  const { characters, scenes, styles, referenceConstraints } = req.body as {
    characters?: number[];
    scenes?: number[];
    styles?: number[];
    referenceConstraints?: number[];
  };

  const characterIds = Array.isArray(characters)
    ? characters.filter((id) => Number.isFinite(Number(id)))
    : [];
  const sceneIds = Array.isArray(scenes)
    ? scenes.filter((id) => Number.isFinite(Number(id)))
    : [];
  const styleIds = Array.isArray(styles)
    ? styles.filter((id) => Number.isFinite(Number(id)))
    : [];
  const referenceConstraintIds = Array.isArray(referenceConstraints)
    ? referenceConstraints.filter((id) => Number.isFinite(Number(id)))
    : [];

  if (
    characterIds.length === 0 &&
    sceneIds.length === 0 &&
    styleIds.length === 0 &&
    referenceConstraintIds.length === 0
  ) {
    res.status(400).json({ error: 'NO_DEFINITIONS_PROVIDED' });
    return;
  }

  try {
    const importedCharacters = [];
    for (const id of characterIds) {
      const cloned = await cloneDefinitionToProject(
        Number(id),
        project.space_id,
        project.id,
      );
      importedCharacters.push(cloned);
    }

    const importedScenes = [];
    for (const id of sceneIds) {
      const cloned = await cloneDefinitionToProject(
        Number(id),
        project.space_id,
        project.id,
      );
      importedScenes.push(cloned);
    }

    const importedStyles = [];
    for (const id of styleIds) {
      const cloned = await cloneDefinitionToProject(
        Number(id),
        project.space_id,
        project.id,
      );
      importedStyles.push(cloned);
    }

    const importedReferenceConstraints = [];
    for (const id of referenceConstraintIds) {
      const cloned = await cloneDefinitionToProject(
        Number(id),
        project.space_id,
        project.id,
      );
      importedReferenceConstraints.push(cloned);
    }

    res.status(201).json({
      imported: {
        characters: importedCharacters,
        scenes: importedScenes,
        styles: importedStyles,
        referenceConstraints: importedReferenceConstraints,
      },
    });
  } catch (error: any) {
    if (
      error instanceof Error &&
      error.message === 'DEFINITION_NOT_FOUND_FOR_SPACE'
    ) {
      res.status(404).json({ error: 'DEFINITION_NOT_FOUND_FOR_SPACE' });
      return;
    }
    // eslint-disable-next-line no-console
    console.error('[import] Project import error:', error);
    res.status(500).json({ error: 'PROJECT_IMPORT_FAILED' });
  }
});

export { router as projectImportRouter };
