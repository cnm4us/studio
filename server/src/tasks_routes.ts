import type { Request, Response } from 'express';
import express from 'express';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { getDbPool } from './db.js';
import type { PublicUser } from './auth_service.js';
import { attachUserFromToken, requireAuth } from './auth_routes.js';
import {
  createRenderedAsset,
  createSpaceTask,
  createTask,
  deleteTask,
  getRenderedAssetById,
  listProjectTasks,
  listRenderedAssetsByProject,
  listRenderedAssetsBySpace,
  listSpaceTasks,
  updateRenderedAssetState,
  updateTaskStatus,
} from './tasks_service.js';
import type { RenderedAssetRecord } from './tasks_service.js';
import { renderImageWithGemini } from './gemini_client.js';
import type {
  CharacterAppearanceMetadata,
  StyleDefinitionMetadata,
} from './definition_metadata.js';
import { renderPrompt } from './prompt_renderer.js';
import {
  collectAssetRefsFromMetadata,
  type CollectedAssetRef,
} from './asset_reference_helpers.js';
import { getSpaceAssetsByIds } from './space_assets_service.js';
import { uploadImageToS3 } from './s3_client.js';

type AuthedRequest = Request & { user?: PublicUser };

type ProjectRecord = {
  id: number;
  space_id: number;
  name: string;
  description: string | null;
  created_at: Date;
};

type TaskWithProject = {
  id: number;
  project_id: number | null;
  space_id: number;
  name: string;
  description: string | null;
  prompt: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

const parseJsonIfString = <T>(value: unknown): T | null => {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as T;
  }
  return null;
};

const signUrlForFileKey = (fileKey: string, existingUrl: string): string => {
  const domain = process.env.CF_DOMAIN;
  const keyPairId = process.env.CF_KEY_PAIR_ID;
  const privateKey = process.env.CF_PRIVATE_KEY_PEM;

  if (!domain || !keyPairId || !privateKey) {
    return existingUrl;
  }

  const trimmedDomain = domain.replace(/\/+$/, '');
  const baseUrl = `https://${trimmedDomain}/${fileKey}`;

  try {
    const signedUrl = getSignedUrl({
      url: baseUrl,
      keyPairId,
      privateKey,
      dateLessThan: new Date(Date.now() + SIGNED_URL_TTL_MS).toISOString(),
    });
    return signedUrl;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      '[cdn] Failed to sign CloudFront URL; falling back to plain URL:',
      error,
    );
    return baseUrl;
  }
};

const maybeSignAssetUrl = (asset: RenderedAssetRecord): RenderedAssetRecord => {
  const url = signUrlForFileKey(asset.file_key, asset.file_url);
  return { ...asset, file_url: url };
};

const maybeSignAssets = (
  assets: RenderedAssetRecord[],
): RenderedAssetRecord[] => assets.map((asset) => maybeSignAssetUrl(asset));

const projectsRouter = express.Router({ mergeParams: true });
const spaceTasksRouter = express.Router({ mergeParams: true });
const taskRenderRouter = express.Router({ mergeParams: true });
const renderedAssetsRouter = express.Router({ mergeParams: true });

projectsRouter.use(attachUserFromToken as any);
projectsRouter.use(requireAuth as any);
spaceTasksRouter.use(attachUserFromToken as any);
spaceTasksRouter.use(requireAuth as any);
taskRenderRouter.use(attachUserFromToken as any);
taskRenderRouter.use(requireAuth as any);
renderedAssetsRouter.use(attachUserFromToken as any);
renderedAssetsRouter.use(requireAuth as any);

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
    `SELECT p.id, p.space_id, p.name, p.description, p.created_at
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

type RenderedAssetWithSpace = RenderedAssetRecord & {
  space_id: number;
};

const loadOwnedRenderedAssetOr404 = async (
  req: AuthedRequest,
  res: Response,
): Promise<RenderedAssetWithSpace | null> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return null;
  }

  const { assetId } = req.params as { assetId?: string };
  const numericAssetId = assetId ? Number(assetId) : NaN;
  if (!Number.isFinite(numericAssetId) || numericAssetId <= 0) {
    res.status(400).json({ error: 'INVALID_RENDERED_ASSET_ID' });
    return null;
  }

  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT ra.*
     FROM rendered_assets ra
     JOIN spaces s ON s.id = ra.space_id
     WHERE ra.id = ? AND s.user_id = ?
     LIMIT 1`,
    [numericAssetId, user.id],
  );
  const list = rows as RenderedAssetWithSpace[];
  if (list.length === 0) {
    res.status(404).json({ error: 'RENDERED_ASSET_NOT_FOUND' });
    return null;
  }

  return list[0];
};

const loadOwnedTaskOr404 = async (
  req: AuthedRequest,
  res: Response,
): Promise<TaskWithProject | null> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return null;
  }

  const { taskId } = req.params as { taskId?: string };
  const numericTaskId = taskId ? Number(taskId) : NaN;
  if (!Number.isFinite(numericTaskId) || numericTaskId <= 0) {
    res.status(400).json({ error: 'INVALID_TASK_ID' });
    return null;
  }

  const db = getDbPool();
  const [rows] = await db.query(
    `SELECT t.*
     FROM tasks t
     JOIN spaces s ON s.id = t.space_id
     WHERE t.id = ? AND s.user_id = ?
     LIMIT 1`,
    [numericTaskId, user.id],
  );
  const list = rows as TaskWithProject[];
  if (list.length === 0) {
    res.status(404).json({ error: 'TASK_NOT_FOUND' });
    return null;
  }

  return list[0];
};

// Project details, tasks and rendered assets

projectsRouter.get(
  '/',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const project = await loadOwnedProjectOr404(req, res);
    if (!project) {
      return;
    }

    res.status(200).json({
      project: {
        id: project.id,
        spaceId: project.space_id,
        name: project.name,
        description: project.description,
        createdAt: project.created_at,
      },
    });
  },
);

// Project-scoped tasks and rendered assets

projectsRouter.post(
  '/tasks',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const project = await loadOwnedProjectOr404(req, res);
    if (!project) {
      return;
    }

    const { name, description, prompt } = req.body as {
      name?: string;
      description?: string | null;
      prompt?: string | null;
    };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'NAME_REQUIRED' });
      return;
    }

    try {
      const task = await createTask(
        project.id,
        name.trim(),
        description ?? null,
        prompt ?? null,
      );
      res.status(201).json({ task });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[tasks] Create task error:', error);
      res.status(500).json({ error: 'TASK_CREATE_FAILED' });
    }
  },
);

projectsRouter.get(
  '/tasks',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const project = await loadOwnedProjectOr404(req, res);
    if (!project) {
      return;
    }

    try {
      const tasks = await listProjectTasks(project.id);
      const db = getDbPool();

      const [assetRows] = await db.query(
        `SELECT task_id, state, COUNT(*) AS count
         FROM rendered_assets
         WHERE project_id = ?
         GROUP BY task_id, state`,
        [project.id],
      );

      const assetStats = new Map<
        number,
        { approved: number; draftOrRunning: number }
      >();

      (assetRows as Array<{ task_id: number; state: string; count: number }>).forEach(
        (row) => {
          const current = assetStats.get(row.task_id) ?? {
            approved: 0,
            draftOrRunning: 0,
          };
          if (row.state === 'approved') {
            current.approved += Number(row.count) || 0;
          } else if (row.state === 'draft') {
            current.draftOrRunning += Number(row.count) || 0;
          }
          assetStats.set(row.task_id, current);
        },
      );

      const projected = tasks.map((task) => {
        const stats = assetStats.get(task.id) ?? {
          approved: 0,
          draftOrRunning: 0,
        };

        let status = task.status;
        if (task.status === 'failed') {
          status = 'failed';
        } else if (stats.approved > 0) {
          status = 'completed';
        } else if (task.status === 'running' || stats.draftOrRunning > 0) {
          status = 'running';
        } else {
          status = 'pending';
        }

        return { ...task, status };
      });

      res.status(200).json({ tasks: projected });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[tasks] List tasks error:', error);
      res.status(500).json({ error: 'TASK_LIST_FAILED' });
    }
  },
);

projectsRouter.get(
  '/rendered-assets',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const project = await loadOwnedProjectOr404(req, res);
    if (!project) {
      return;
    }

    try {
      const assets = await listRenderedAssetsByProject(project.id);
      const visible = assets.filter((asset) => asset.state !== 'archived');
      const signed = maybeSignAssets(visible);
      res.status(200).json({ assets: signed });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[tasks] List rendered assets error:', error);
      res.status(500).json({ error: 'RENDERED_ASSET_LIST_FAILED' });
    }
  },
);

// Space-scoped tasks and rendered assets

spaceTasksRouter.post(
  '/tasks',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }

    const { spaceId } = req.params as { spaceId?: string };
    const numericSpaceId = spaceId ? Number(spaceId) : NaN;
    if (!Number.isFinite(numericSpaceId) || numericSpaceId <= 0) {
      res.status(400).json({ error: 'INVALID_SPACE_ID' });
      return;
    }

    const db = getDbPool();
    const [rows] = await db.query(
      'SELECT id FROM spaces WHERE id = ? AND user_id = ? LIMIT 1',
      [numericSpaceId, user.id],
    );
    const list = rows as Array<{ id: number }>;
    if (list.length === 0) {
      res.status(404).json({ error: 'SPACE_NOT_FOUND' });
      return;
    }

    const { name, description, prompt } = req.body as {
      name?: string;
      description?: string | null;
      prompt?: string | null;
    };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'NAME_REQUIRED' });
      return;
    }

    try {
      const task = await createSpaceTask(
        numericSpaceId,
        name.trim(),
        description ?? null,
        prompt ?? null,
      );
      res.status(201).json({ task });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[space-tasks] Create task error:', error);
      res.status(500).json({ error: 'TASK_CREATE_FAILED' });
    }
  },
);

spaceTasksRouter.get(
  '/tasks',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }

    const { spaceId } = req.params as { spaceId?: string };
    const numericSpaceId = spaceId ? Number(spaceId) : NaN;
    if (!Number.isFinite(numericSpaceId) || numericSpaceId <= 0) {
      res.status(400).json({ error: 'INVALID_SPACE_ID' });
      return;
    }

    const db = getDbPool();
    const [rows] = await db.query(
      'SELECT id FROM spaces WHERE id = ? AND user_id = ? LIMIT 1',
      [numericSpaceId, user.id],
    );
    const list = rows as Array<{ id: number }>;
    if (list.length === 0) {
      res.status(404).json({ error: 'SPACE_NOT_FOUND' });
      return;
    }

    try {
      const tasks = await listSpaceTasks(numericSpaceId);

      const [assetRows] = await db.query(
        `SELECT task_id, state, COUNT(*) AS count
         FROM rendered_assets
         WHERE space_id = ?
         GROUP BY task_id, state`,
        [numericSpaceId],
      );

      const assetStats = new Map<
        number,
        { approved: number; draftOrRunning: number }
      >();

      (assetRows as Array<{ task_id: number; state: string; count: number }>).forEach(
        (row) => {
          const current = assetStats.get(row.task_id) ?? {
            approved: 0,
            draftOrRunning: 0,
          };
          if (row.state === 'approved') {
            current.approved += Number(row.count) || 0;
          } else if (row.state === 'draft') {
            current.draftOrRunning += Number(row.count) || 0;
          }
          assetStats.set(row.task_id, current);
        },
      );

      const projected = tasks.map((task) => {
        const stats = assetStats.get(task.id) ?? {
          approved: 0,
          draftOrRunning: 0,
        };

        let status = task.status;
        if (task.status === 'failed') {
          status = 'failed';
        } else if (stats.approved > 0) {
          status = 'completed';
        } else if (task.status === 'running' || stats.draftOrRunning > 0) {
          status = 'running';
        } else {
          status = 'pending';
        }

        return { ...task, status };
      });

      res.status(200).json({ tasks: projected });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[space-tasks] List tasks error:', error);
      res.status(500).json({ error: 'TASK_LIST_FAILED' });
    }
  },
);

spaceTasksRouter.get(
  '/rendered-assets',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }

    const { spaceId } = req.params as { spaceId?: string };
    const numericSpaceId = spaceId ? Number(spaceId) : NaN;
    if (!Number.isFinite(numericSpaceId) || numericSpaceId <= 0) {
      res.status(400).json({ error: 'INVALID_SPACE_ID' });
      return;
    }

    const db = getDbPool();
    const [rows] = await db.query(
      'SELECT id FROM spaces WHERE id = ? AND user_id = ? LIMIT 1',
      [numericSpaceId, user.id],
    );
    const list = rows as Array<{ id: number }>;
    if (list.length === 0) {
      res.status(404).json({ error: 'SPACE_NOT_FOUND' });
      return;
    }

    try {
      const assets = await listRenderedAssetsBySpace(numericSpaceId);
      const visible = assets.filter((asset) => asset.state !== 'archived');
      const signed = maybeSignAssets(visible);
      res.status(200).json({ assets: signed });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[space-tasks] List rendered assets error:', error);
      res.status(500).json({ error: 'RENDERED_ASSET_LIST_FAILED' });
    }
  },
);

// Rendered asset state updates (draft/approved/archived)

renderedAssetsRouter.patch(
  '/:assetId',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const asset = await loadOwnedRenderedAssetOr404(req, res);
    if (!asset) {
      return;
    }

    const { state } = req.body as {
      state?: 'draft' | 'approved' | 'archived' | string;
    };

    if (state !== 'draft' && state !== 'approved' && state !== 'archived') {
      res.status(400).json({ error: 'INVALID_RENDERED_ASSET_STATE' });
      return;
    }

    try {
      await updateRenderedAssetState(asset.id, state);
      const updated = await getRenderedAssetById(asset.id);
      if (!updated) {
        res.status(404).json({ error: 'RENDERED_ASSET_NOT_FOUND' });
        return;
      }
      const signed = maybeSignAssetUrl(updated);
      res.status(200).json({ asset: signed });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[tasks] Update rendered asset state error:', error);
      res.status(500).json({ error: 'RENDERED_ASSET_UPDATE_FAILED' });
    }
  },
);

// Task deletion — only allowed when no approved renders exist

taskRenderRouter.delete(
  '/',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }

    const { taskId } = req.params as { taskId?: string };
    const numericTaskId = taskId ? Number(taskId) : NaN;
    if (!Number.isFinite(numericTaskId) || numericTaskId <= 0) {
      res.status(400).json({ error: 'INVALID_TASK_ID' });
      return;
    }

    const db = getDbPool();

    const [rows] = await db.query(
      `SELECT t.id, t.project_id, t.space_id
       FROM tasks t
       JOIN spaces s ON s.id = t.space_id
       WHERE t.id = ? AND s.user_id = ?
       LIMIT 1`,
      [numericTaskId, user.id],
    );
    const list = rows as Array<{
      id: number;
      project_id: number | null;
      space_id: number;
    }>;
    if (list.length === 0) {
      res.status(404).json({ error: 'TASK_NOT_FOUND' });
      return;
    }

    const [assetRows] = await db.query(
      `SELECT COUNT(*) AS approvedCount
       FROM rendered_assets
       WHERE task_id = ? AND state = 'approved'`,
      [numericTaskId],
    );
    const approvedCount =
      (assetRows as Array<{ approvedCount: number }>)[0]?.approvedCount ?? 0;

    if (approvedCount > 0) {
      res.status(400).json({ error: 'TASK_HAS_APPROVED_RENDERS' });
      return;
    }

    await deleteTask(numericTaskId);
    res.status(204).send();
  },
);

// Task render endpoint

taskRenderRouter.post(
  '/render',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const task = await loadOwnedTaskOr404(req, res);
    if (!task) {
      return;
    }

    const input = req.body as {
      prompt?: string | null;
      characterDefinitionId?: number | null;
      characterDefinitionIds?: number[] | null;
      styleDefinitionId?: number | null;
      sceneDefinitionId?: number | null;
    };

    let prompt = input?.prompt ?? null;
    if (!prompt || prompt.trim().length === 0) {
      if (task.prompt && task.prompt.trim().length > 0) {
        prompt = task.prompt;
      } else {
        if (task.project_id) {
          prompt = `Render an image for project ${task.project_id} / task ${task.id}`;
        } else {
          prompt = `Render an image for space ${task.space_id} / task ${task.id}`;
        }
      }
    }

    try {
      await updateTaskStatus(task.id, 'running');

      const db = getDbPool();

      let characterDefinitions: any[] = [];
      let styleDefinition: any | null = null;
      let sceneDefinition: any | null = null;

      const characterIdsRaw =
        (Array.isArray(input?.characterDefinitionIds)
          ? input?.characterDefinitionIds
          : []) ?? [];
      const characterIds: number[] =
        characterIdsRaw.length > 0
          ? characterIdsRaw
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id) && id > 0)
          : input?.characterDefinitionId
          ? [input.characterDefinitionId]
          : [];

      if (characterIds.length > 0) {
        const [rows] = await db.query(
          `SELECT *
           FROM definitions
           WHERE id IN (?)
             AND (
               (scope = 'project' AND project_id = ?)
               OR (scope = 'space' AND space_id = ?)
             )
             AND type = 'character'`,
          [characterIds, task.project_id, task.space_id],
        );
        const list = rows as any[];
        if (list.length === 0 || list.length !== characterIds.length) {
          res.status(400).json({ error: 'CHARACTER_DEFINITION_NOT_FOUND' });
          return;
        }
        characterDefinitions = list;
      }

      if (input?.styleDefinitionId) {
        const [rows] = await db.query(
          `SELECT *
           FROM definitions
           WHERE id = ?
             AND (
               (scope = 'project' AND project_id = ?)
               OR (scope = 'space' AND space_id = ?)
             )
             AND type = 'style'
           LIMIT 1`,
          [input.styleDefinitionId, task.project_id, task.space_id],
        );
        const list = rows as any[];
        if (list.length === 0) {
          res.status(400).json({ error: 'STYLE_DEFINITION_NOT_FOUND' });
          return;
        }
        styleDefinition = list[0];
      }

      if (input?.sceneDefinitionId) {
        const [rows] = await db.query(
          `SELECT *
           FROM definitions
           WHERE id = ?
             AND (
               (scope = 'project' AND project_id = ?)
               OR (scope = 'space' AND space_id = ?)
             )
             AND type = 'scene'
           LIMIT 1`,
          [input.sceneDefinitionId, task.project_id, task.space_id],
        );
        const list = rows as any[];
        if (list.length === 0) {
          res.status(400).json({ error: 'SCENE_DEFINITION_NOT_FOUND' });
          return;
        }
        sceneDefinition = list[0];
      }

      const characterMetas: CharacterAppearanceMetadata[] =
        characterDefinitions.map((def) => {
          const parsed = parseJsonIfString<CharacterAppearanceMetadata>(
            def?.metadata,
          );
          return parsed ?? ({} as CharacterAppearanceMetadata);
        });
      const styleMeta = parseJsonIfString<StyleDefinitionMetadata>(
        styleDefinition?.metadata,
      );
      const sceneMeta = parseJsonIfString<unknown>(sceneDefinition?.metadata);

      let collectedRefs: CollectedAssetRef[] = [];
      try {
        collectedRefs = collectAssetRefsFromMetadata({
          characters: characterDefinitions.map((def, index) => {
            const meta = characterMetas[index] ?? null;
            const coreName = meta?.core_identity?.name;
            return {
              id: def.id as number,
              name: coreName || (def?.name as string) || 'Character',
              metadata: meta,
            };
          }),
          style: styleDefinition
            ? {
                id: styleDefinition.id as number,
                name: (styleDefinition.name as string) ?? 'Style',
                metadata: styleMeta ?? null,
              }
            : null,
          scene: sceneDefinition
            ? {
                id: sceneDefinition.id as number,
                name: (sceneDefinition.name as string) ?? 'Scene',
                metadata: (sceneMeta as Record<string, unknown>) ?? null,
              }
            : null,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          '[space-assets] Failed to collect asset references from metadata:',
          err,
        );
        collectedRefs = [];
      }

      let resolvedImageRefs: import('./prompt_renderer.js').ResolvedPromptImageRef[] =
        [];

      try {
        const assetIdSet = new Set<number>();
          for (const ref of collectedRefs) {
            for (const rawId of ref.assetIds) {
              const numeric = Number(rawId);
              if (Number.isFinite(numeric) && numeric > 0) {
                assetIdSet.add(numeric);
              }
            }
          }

        const assetIds = Array.from(assetIdSet);
        if (assetIds.length > 0 && task.space_id) {
          const spaceAssets = await getSpaceAssetsByIds(
            task.space_id,
            assetIds,
          );
          const assetsById = new Map<number, (typeof spaceAssets)[number]>();
          for (const asset of spaceAssets) {
            assetsById.set(asset.id, asset);
          }

          resolvedImageRefs = collectedRefs.flatMap((ref) =>
            ref.assetIds
              .map((rawId) => {
                const id = Number(rawId);
                if (!Number.isFinite(id)) return null;
                const asset = assetsById.get(id);
                if (!asset) return null;
                const signedUrl = signUrlForFileKey(
                  asset.file_key,
                  asset.file_url,
                );
                return {
                  scope: ref.scope,
                  definitionName: ref.definitionName,
                  assetType: ref.binding.assetType,
                  assetName: asset.name,
                  url: signedUrl,
                };
              })
              .filter(Boolean) as import('./prompt_renderer.js').ResolvedPromptImageRef[],
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          '[space-assets] Failed to resolve space assets for prompt; continuing without image references:',
          err,
        );
        resolvedImageRefs = [];
      }

      const finalPrompt = renderPrompt({
        taskPrompt: prompt,
        characters: characterDefinitions.map((def, index) => {
          const meta = characterMetas[index] ?? null;
          const coreName = meta?.core_identity?.name;
          return {
            name: coreName || (def?.name as string) || 'Character',
            metadata: meta,
          };
        }),
        style: styleMeta,
        scene: sceneMeta,
        imageReferences: resolvedImageRefs,
      });

      const image = await renderImageWithGemini(finalPrompt);

      const timestamp = Date.now();
      const extension =
        image.mimeType === 'image/png'
          ? 'png'
          : image.mimeType === 'image/jpeg'
          ? 'jpg'
          : 'bin';

      const key =
        task.project_id != null
          ? `projects/${task.project_id}/tasks/${task.id}/${timestamp}.${extension}`
          : `spaces/${task.space_id}/tasks/${task.id}/${timestamp}.${extension}`;
      const uploadResult = await uploadImageToS3(
        key,
        image.data,
        image.mimeType,
      );

      const metadata = {
        prompt: finalPrompt,
        mimeType: image.mimeType,
        model:
          process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3-pro-image-preview',
        characterDefinitionId:
          characterDefinitions[0]?.id ?? null,
        characterDefinitionIds: characterDefinitions.map(
          (def) => def.id as number,
        ),
        styleDefinitionId: styleDefinition?.id ?? null,
        characterMetadata: characterMetas[0] ?? null,
        characterMetadatas: characterMetas,
        styleMetadata: styleMeta ?? null,
        sceneDefinitionId: sceneDefinition?.id ?? null,
        sceneMetadata: sceneMeta ?? null,
      };

      const asset = await createRenderedAsset(
        task.project_id,
        task.space_id,
        task.id,
        'image',
        uploadResult.key,
        uploadResult.url,
        metadata,
      );

      const [rows] = await db.query(
        'SELECT * FROM tasks WHERE id = ? LIMIT 1',
        [task.id],
      );
      const list = rows as TaskWithProject[];
      const updatedTask = list[0];

      const signedAsset = maybeSignAssetUrl(asset);

      res.status(201).json({
        task: updatedTask,
        renderedAssets: [signedAsset],
      });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[tasks] Render task error:', error);
      try {
        await updateTaskStatus(task.id, 'failed');
      } catch {
        // ignore status update failures
      }

      if (
        error instanceof Error &&
        (error.message === 'GEMINI_NOT_CONFIGURED' ||
          error.message === 'GEMINI_NO_IMAGE_RETURNED')
      ) {
        res.status(500).json({ error: error.message });
        return;
      }
      if (error instanceof Error && error.message === 'S3_NOT_CONFIGURED') {
        res.status(500).json({ error: 'S3_NOT_CONFIGURED' });
        return;
      }

      res.status(500).json({ error: 'TASK_RENDER_FAILED' });
    }
  },
);

export {
  projectsRouter as projectTasksRouter,
  spaceTasksRouter,
  taskRenderRouter,
  renderedAssetsRouter,
};
