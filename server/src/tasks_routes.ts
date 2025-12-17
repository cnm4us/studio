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
import {
  renderImageWithGemini,
  type GeminiInlineImage,
  isPromptDebugEnabled,
} from './gemini_client.js';
import type {
  CharacterAppearanceMetadata,
  StyleDefinitionMetadata,
  ReferenceConstraintMetadata,
} from './definition_metadata.js';
import { renderPrompt } from './prompt_renderer.js';
import {
  collectAssetRefsFromMetadata,
  type CollectedAssetRef,
} from './asset_reference_helpers.js';
import { getSpaceAssetsByIds } from './space_assets_service.js';
import { uploadImageToS3 } from './s3_client.js';
import {
  loadInlineImageParts,
  type InlineImageInput,
} from './image_inline_helpers.js';

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
  aspect_ratio: string | null;
  sfx_metadata: unknown | null;
  speech_metadata: unknown | null;
  thought_metadata: unknown | null;
  created_at: Date;
  updated_at: Date;
};

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;
const getMaxInlineImagesTotal = (): number => {
  const raw = process.env.GEMINI_MAX_INLINE_IMAGES_TOTAL;
  const numeric = raw ? Number(raw) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 8;
};

const getMaxInlineImagesByScope = (): {
  character: number;
  scene: number;
  style: number;
} => {
  const rawCharacter = process.env.GEMINI_MAX_INLINE_IMAGES_CHARACTER;
  const rawScene = process.env.GEMINI_MAX_INLINE_IMAGES_SCENE;
  const rawStyle = process.env.GEMINI_MAX_INLINE_IMAGES_STYLE;

  const character = rawCharacter ? Number(rawCharacter) : NaN;
  const scene = rawScene ? Number(rawScene) : NaN;
  const style = rawStyle ? Number(rawStyle) : NaN;

  return {
    character:
      Number.isFinite(character) && character > 0 ? character : 4,
    scene: Number.isFinite(scene) && scene > 0 ? scene : 3,
    style: Number.isFinite(style) && style > 0 ? style : 3,
  };
};

type InlineImageScopedCandidate = {
  input: InlineImageInput;
  scope: import('./asset_reference_helpers.js').PromptAssetRefScope;
  assetType: import('../../shared/definition_config/assetReferenceMapping.js').AssetReferenceType;
  definitionName: string;
  assetName: string;
  usageInstruction?: string;
};

const defaultUsageForAssetType = (
  assetType: import('../../shared/definition_config/assetReferenceMapping.js').AssetReferenceType,
): string => {
  switch (assetType) {
    case 'character_face':
      return 'Use this image only for the character’s facial identity and expression; do not copy clothing, background, or other details literally.';
    case 'character_body':
      return 'Use this image for overall body proportions and posture; keep facial identity from the primary face reference.';
    case 'character_hair':
      return 'Use this image for hairstyle and hair texture only.';
    case 'character_full':
      return 'Use this image as a full-character identity and pose reference.';
    case 'character_prop':
      return 'Use this image for prop details only; do not change the character’s identity based on it.';
    case 'character_clothing':
      return 'Use this image for clothing and outfit details only; keep the character’s face and body from the other references.';
    case 'scene_reference':
      return 'Use this image for scene layout, environment, and lighting; keep character identity from character references.';
    case 'style_reference':
      return 'Use this image for rendering style, line work, and color treatment only.';
    default:
      return '';
  }
};

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

type TaskBubbleMetadataWire = {
  text: string | null;
  position: string | null;
  style: string | null;
  instructions: string | null;
} | null;

const toTaskBubbleMetadataWire = (value: unknown): TaskBubbleMetadataWire => {
  const parsed = parseJsonIfString<{
    text?: unknown;
    position?: unknown;
    style?: unknown;
    instructions?: unknown;
  }>(value);
  if (!parsed) return null;

  const text =
    typeof parsed.text === 'string' && parsed.text.trim().length > 0
      ? parsed.text.trim()
      : null;
  const position =
    typeof parsed.position === 'string' && parsed.position.trim().length > 0
      ? parsed.position.trim()
      : null;
  const style =
    typeof parsed.style === 'string' && parsed.style.trim().length > 0
      ? parsed.style.trim()
      : null;

  let instructions: string | null = null;
  if (typeof parsed.instructions === 'string') {
    const trimmed = parsed.instructions.trim();
    if (trimmed) {
      instructions = trimmed;
    }
  }

  if (!instructions) {
    const parts: string[] = [];
    if (text) parts.push(`Text: ${text}`);
    if (position) parts.push(`Position: ${position}`);
    if (style) parts.push(`Style: ${style}`);
    if (parts.length > 0) {
      instructions = parts.join(' | ');
    }
  }

  if (!text && !position && !style && !instructions) {
    return null;
  }

  return {
    text,
    position,
    style,
    instructions,
  };
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
      const aspectRatio =
        (task as any).aspect_ratio && typeof (task as any).aspect_ratio === 'string'
          ? ((task as any).aspect_ratio as string)
          : null;
      const sfxMetadata = toTaskBubbleMetadataWire(
        (task as any).sfx_metadata,
      );
      const speechMetadata = toTaskBubbleMetadataWire(
        (task as any).speech_metadata,
      );
      const thoughtMetadata = toTaskBubbleMetadataWire(
        (task as any).thought_metadata,
      );
      res.status(201).json({
        task: {
          ...task,
          aspect_ratio: aspectRatio,
          aspectRatio,
          sfxMetadata,
          speechMetadata,
          thoughtMetadata,
        },
      });
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

        const aspectRatio =
          (task as any).aspect_ratio && typeof (task as any).aspect_ratio === 'string'
            ? ((task as any).aspect_ratio as string)
            : null;
        const sfxMetadata = toTaskBubbleMetadataWire(
          (task as any).sfx_metadata,
        );
        const speechMetadata = toTaskBubbleMetadataWire(
          (task as any).speech_metadata,
        );
        const thoughtMetadata = toTaskBubbleMetadataWire(
          (task as any).thought_metadata,
        );

        return {
          ...task,
          status,
          aspect_ratio: aspectRatio,
          aspectRatio,
          sfxMetadata,
          speechMetadata,
          thoughtMetadata,
        };
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
      const aspectRatio =
        (task as any).aspect_ratio && typeof (task as any).aspect_ratio === 'string'
          ? ((task as any).aspect_ratio as string)
          : null;
      const sfxMetadata = toTaskBubbleMetadataWire(
        (task as any).sfx_metadata,
      );
      const speechMetadata = toTaskBubbleMetadataWire(
        (task as any).speech_metadata,
      );
      const thoughtMetadata = toTaskBubbleMetadataWire(
        (task as any).thought_metadata,
      );
      res.status(201).json({
        task: {
          ...task,
          aspect_ratio: aspectRatio,
          aspectRatio,
          sfxMetadata,
          speechMetadata,
          thoughtMetadata,
        },
      });
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

        const aspectRatio =
          (task as any).aspect_ratio && typeof (task as any).aspect_ratio === 'string'
            ? ((task as any).aspect_ratio as string)
            : null;
        const sfxMetadata = toTaskBubbleMetadataWire(
          (task as any).sfx_metadata,
        );
        const speechMetadata = toTaskBubbleMetadataWire(
          (task as any).speech_metadata,
        );
        const thoughtMetadata = toTaskBubbleMetadataWire(
          (task as any).thought_metadata,
        );

        return {
          ...task,
          status,
          aspect_ratio: aspectRatio,
          aspectRatio,
          sfxMetadata,
          speechMetadata,
          thoughtMetadata,
        };
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

// Task metadata updates (e.g., aspect ratio)

taskRenderRouter.patch(
  '/',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const task = await loadOwnedTaskOr404(req, res);
    if (!task) {
      return;
    }

    const body = req.body as {
      aspectRatio?: string | null;
      sfxMetadata?: TaskBubbleMetadataWire;
      speechMetadata?: TaskBubbleMetadataWire;
      thoughtMetadata?: TaskBubbleMetadataWire;
    };

    const hasAspectRatio = Object.prototype.hasOwnProperty.call(
      body,
      'aspectRatio',
    );
    const hasSfx = Object.prototype.hasOwnProperty.call(
      body,
      'sfxMetadata',
    );
    const hasSpeech = Object.prototype.hasOwnProperty.call(
      body,
      'speechMetadata',
    );
    const hasThought = Object.prototype.hasOwnProperty.call(
      body,
      'thoughtMetadata',
    );

    if (!hasAspectRatio && !hasSfx && !hasSpeech && !hasThought) {
      res.status(400).json({ error: 'TASK_UPDATE_EMPTY' });
      return;
    }

    const { aspectRatio, sfxMetadata, speechMetadata, thoughtMetadata } = body;

    try {
      const db = getDbPool();
      const updates: string[] = [];
      const params: any[] = [];

      if (hasAspectRatio) {
        const allowedAspectRatios = new Set([
          '1:1',
          '3:4',
          '4:3',
          '9:16',
          '16:9',
        ]);
        const normalizedAspectRatio =
          aspectRatio && allowedAspectRatios.has(aspectRatio)
            ? aspectRatio
            : null;
        updates.push('aspect_ratio = ?');
        params.push(normalizedAspectRatio);
      }

      const normalizeBubbleForUpdate = (
        value: TaskBubbleMetadataWire | undefined,
      ): string | null => {
        if (!value) return null;
        const text =
          typeof value.text === 'string' && value.text.trim().length > 0
            ? value.text.trim()
            : null;
        const position =
          typeof value.position === 'string' &&
          value.position.trim().length > 0
            ? value.position.trim()
            : null;
        const style =
          typeof value.style === 'string' && value.style.trim().length > 0
            ? value.style.trim()
            : null;

        let instructions: string | null =
          typeof value.instructions === 'string' &&
          value.instructions.trim().length > 0
            ? value.instructions.trim()
            : null;
        if (!instructions) {
          const parts: string[] = [];
          if (text) parts.push(`Text: ${text}`);
          if (position) parts.push(`Position: ${position}`);
          if (style) parts.push(`Style: ${style}`);
          if (parts.length > 0) {
            instructions = parts.join(' | ');
          }
        }

        if (!text && !position && !style && !instructions) {
          return null;
        }

        return JSON.stringify({
          text,
          position,
          style,
          instructions,
        });
      };

      if (hasSfx) {
        updates.push('sfx_metadata = ?');
        params.push(normalizeBubbleForUpdate(sfxMetadata));
      }
      if (hasSpeech) {
        updates.push('speech_metadata = ?');
        params.push(normalizeBubbleForUpdate(speechMetadata));
      }
      if (hasThought) {
        updates.push('thought_metadata = ?');
        params.push(normalizeBubbleForUpdate(thoughtMetadata));
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'TASK_UPDATE_EMPTY' });
        return;
      }

      await db.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        [...params, task.id],
      );

      const [rows] = await db.query(
        'SELECT * FROM tasks WHERE id = ? LIMIT 1',
        [task.id],
      );
      const list = rows as TaskWithProject[];
      const updatedTask = list[0];

      const updatedAspectRatio =
        updatedTask?.aspect_ratio &&
        typeof updatedTask.aspect_ratio === 'string'
          ? updatedTask.aspect_ratio
          : null;
      const updatedSfx = toTaskBubbleMetadataWire(
        (updatedTask as any).sfx_metadata,
      );
      const updatedSpeech = toTaskBubbleMetadataWire(
        (updatedTask as any).speech_metadata,
      );
      const updatedThought = toTaskBubbleMetadataWire(
        (updatedTask as any).thought_metadata,
      );

      res.status(200).json({
        aspectRatio: updatedAspectRatio,
        sfxMetadata: updatedSfx,
        speechMetadata: updatedSpeech,
        thoughtMetadata: updatedThought,
      });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[tasks] Update task metadata error:', error);
      res.status(500).json({ error: 'TASK_UPDATE_FAILED' });
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
      referenceConstraintDefinitionId?: number | null;
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
      let referenceConstraintDefinition: any | null = null;

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

      if (input?.referenceConstraintDefinitionId) {
        const [rows] = await db.query(
          `SELECT *
           FROM definitions
           WHERE id = ?
             AND (
               (scope = 'project' AND project_id = ?)
               OR (scope = 'space' AND space_id = ?)
             )
             AND type = 'reference_constraint'
           LIMIT 1`,
          [
            input.referenceConstraintDefinitionId,
            task.project_id,
            task.space_id,
          ],
        );
        const list = rows as any[];
        if (list.length === 0) {
          res
            .status(400)
            .json({ error: 'REFERENCE_CONSTRAINT_DEFINITION_NOT_FOUND' });
          return;
        }
        referenceConstraintDefinition = list[0];
        // eslint-disable-next-line no-console
        console.log(
          `[ai] Reference constraint for task ${task.id}: definitionId=${referenceConstraintDefinition.id}, name="${referenceConstraintDefinition.name}"`,
        );
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
      const referenceConstraintMeta =
        parseJsonIfString<ReferenceConstraintMetadata>(
          referenceConstraintDefinition?.metadata,
        );

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
          referenceConstraint: referenceConstraintDefinition
            ? {
                id: referenceConstraintDefinition.id as number,
                name:
                  (referenceConstraintDefinition.name as string) ??
                  'Reference Constraint',
                metadata: referenceConstraintMeta ?? null,
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
      let inlineImageInputs: InlineImageInput[] = [];
      let scopedCandidates: InlineImageScopedCandidate[] = [];

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

          scopedCandidates = [];

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

                const assetIdStr = String(asset.id);
                const overrideUsage =
                  referenceConstraintMeta?.reference_images_usage?.[
                    assetIdStr
                  ]?.usageInstruction;
                const rawUsage =
                  overrideUsage && overrideUsage.trim().length > 0
                    ? overrideUsage.trim()
                    : asset.usage_hint && asset.usage_hint.trim().length > 0
                    ? asset.usage_hint.trim()
                    : defaultUsageForAssetType(ref.binding.assetType);

                const resolvedRef: import('./prompt_renderer.js').ResolvedPromptImageRef =
                  {
                    scope: ref.scope,
                    definitionName: ref.definitionName,
                    assetType: ref.binding.assetType,
                    assetName: asset.name,
                    url: signedUrl,
                    assetId: asset.id,
                    usageInstruction: rawUsage || undefined,
                  };

                const meta = asset.metadata as
                  | { mimeType?: string | null }
                  | null;
                const mimeType =
                  meta && typeof meta === 'object' && meta.mimeType
                    ? String(meta.mimeType)
                    : 'image/jpeg';

                scopedCandidates.push({
                  input: {
                    fileKey: asset.file_key,
                    mimeType,
                  },
                  scope: ref.scope,
                  assetType: ref.binding.assetType,
                  definitionName: ref.definitionName,
                  assetName: asset.name,
                  usageInstruction: rawUsage || undefined,
                });

                return resolvedRef;
              })
              .filter(Boolean) as import('./prompt_renderer.js').ResolvedPromptImageRef[],
          );

          if (scopedCandidates.length > 0) {
            const candidatesByScope = new Map<
              import('./asset_reference_helpers.js').PromptAssetRefScope,
              InlineImageScopedCandidate[]
            >();

            for (const candidate of scopedCandidates) {
              const existing = candidatesByScope.get(candidate.scope);
              if (existing) {
                existing.push(candidate);
              } else {
                candidatesByScope.set(candidate.scope, [candidate]);
              }
            }

            const scopeOrder: import('./asset_reference_helpers.js').PromptAssetRefScope[] =
              ['character', 'scene', 'style'];

            const maxByScope = getMaxInlineImagesByScope();
            const maxTotal = getMaxInlineImagesTotal();

            const selectedCandidates: InlineImageScopedCandidate[] = [];

            const totalPerScopeCounts: Record<
              import('./asset_reference_helpers.js').PromptAssetRefScope,
              number
            > = {
              character: 0,
              scene: 0,
              style: 0,
            };

            for (const scope of scopeOrder) {
              const listForScope = candidatesByScope.get(scope) ?? [];
              if (listForScope.length === 0) continue;

              totalPerScopeCounts[scope] = listForScope.length;

              const limit = maxByScope[scope];
              const slice = listForScope.slice(0, limit);
              selectedCandidates.push(...slice);
            }

            let finalCandidates = selectedCandidates;
            if (finalCandidates.length > maxTotal) {
              finalCandidates = finalCandidates.slice(0, maxTotal);
            }

            const sentPerScope: Record<
              import('./asset_reference_helpers.js').PromptAssetRefScope,
              number
            > = {
              character: 0,
              scene: 0,
              style: 0,
            };
            for (const candidate of finalCandidates) {
              sentPerScope[candidate.scope] += 1;
            }

            const totalRequested = scopedCandidates.length;
            const totalSent = finalCandidates.length;

            if (totalSent < totalRequested) {
              const droppedCharacter =
                totalPerScopeCounts.character - sentPerScope.character;
              const droppedScene =
                totalPerScopeCounts.scene - sentPerScope.scene;
              const droppedStyle =
                totalPerScopeCounts.style - sentPerScope.style;

              // eslint-disable-next-line no-console
              console.log(
                `[ai] Truncated inline images for task ${task.id}: ` +
                  `requested=${totalRequested}, sent=${totalSent}, ` +
                  `droppedByScope={character:${droppedCharacter}, scene:${droppedScene}, style:${droppedStyle}}`,
              );
            }

            inlineImageInputs = finalCandidates.map(
              (candidate) => candidate.input,
            );

            if (isPromptDebugEnabled() && finalCandidates.length > 0) {
              // eslint-disable-next-line no-console
              console.log('[ai] Inline image usage for task', task.id);
              for (const candidate of finalCandidates) {
                // eslint-disable-next-line no-console
                console.log(
                  `  - ${candidate.scope}/${candidate.assetType}: assetName="${candidate.assetName}"` +
                    (candidate.usageInstruction
                      ? `, usage="${candidate.usageInstruction}"`
                      : ''),
                );
              }
            }
          } else {
            inlineImageInputs = [];
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          '[space-assets] Failed to resolve space assets for prompt; continuing without image references:',
          err,
        );
        resolvedImageRefs = [];
        inlineImageInputs = [];
      }

      const sfxMeta = toTaskBubbleMetadataWire(
        (task as any).sfx_metadata,
      );
      const speechMeta = toTaskBubbleMetadataWire(
        (task as any).speech_metadata,
      );
      const thoughtMeta = toTaskBubbleMetadataWire(
        (task as any).thought_metadata,
      );

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
        referenceConstraint: referenceConstraintMeta,
        referenceConstraintName: referenceConstraintDefinition
          ? (referenceConstraintDefinition.name as string)
          : null,
        imageReferences: resolvedImageRefs,
        sfxInstructions: sfxMeta?.instructions ?? null,
        speechInstructions: speechMeta?.instructions ?? null,
        thoughtInstructions: thoughtMeta?.instructions ?? null,
      });
      const hasInlineImages = inlineImageInputs.length > 0;

      let inlineImages: GeminiInlineImage[] = [];
      let inlineImageTexts: string[] = [];
      if (hasInlineImages) {
        try {
          const parts = await loadInlineImageParts(inlineImageInputs);
          inlineImages = parts.map((part) => ({
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          }));

          if (inlineImages.length > 0) {
            // eslint-disable-next-line no-console
            console.log(
              '[ai] Inline images loaded for task',
              task.id,
              'count=',
              inlineImages.length,
            );
            if (resolvedImageRefs.length > 0) {
              // eslint-disable-next-line no-console
              console.log('[ai] Inline image refs for task', task.id);
              for (const ref of resolvedImageRefs) {
                // Note: this may include more refs than are inlined
                // if caps/truncation applied.
                // That is acceptable for high-level traceability.
                // eslint-disable-next-line no-console
                console.log(
                  `  - ${ref.scope}/${ref.assetType}: definition="${ref.definitionName}", assetName="${ref.assetName}", url="${ref.url}"`,
                );
              }
            }

            if (inlineImages.length > 0 && inlineImageInputs.length > 0) {
              const ASSET_TYPE_LABELS_LOCAL: Record<
                import('../../shared/definition_config/assetReferenceMapping.js').AssetReferenceType,
                string
              > = {
                character_face: 'Character reference images',
                character_body: 'Body reference images',
                character_hair: 'Hair reference images',
                character_full: 'Full-character reference images',
                character_prop: 'Prop reference images',
                character_clothing: 'Clothing reference images',
                scene_reference: 'Scene reference images',
                style_reference: 'Style reference images',
              };

              const labelTexts: string[] = [];

              const candidatesByInputKey = new Map<
                string,
                InlineImageScopedCandidate
              >();
              for (const candidate of scopedCandidates) {
                const key = `${candidate.input.fileKey}|${candidate.input.mimeType}`;
                if (!candidatesByInputKey.has(key)) {
                  candidatesByInputKey.set(key, candidate);
                }
              }

              inlineImageInputs.forEach((input) => {
                const key = `${input.fileKey}|${input.mimeType}`;
                const candidate = candidatesByInputKey.get(key);
                if (!candidate) {
                  labelTexts.push('');
                  return;
                }

                const typeLabel =
                  ASSET_TYPE_LABELS_LOCAL[candidate.assetType] ??
                  candidate.assetType;
                const header = `Image reference: ${candidate.assetName} — ${typeLabel}.`;
                const usage =
                  candidate.usageInstruction &&
                  candidate.usageInstruction.trim().length > 0
                    ? `Usage: ${candidate.usageInstruction.trim()}`
                    : '';
                labelTexts.push(
                  usage && usage.length > 0
                    ? `${header}\n${usage}`
                    : header,
                );
              });

              inlineImageTexts = labelTexts;
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(
            '[space-assets] Failed to load inline images from S3; falling back to text-only prompt:',
            err,
          );
          inlineImages = [];
        }
      }

      const allowedAspectRatios = new Set([
        '1:1',
        '3:4',
        '4:3',
        '9:16',
        '16:9',
      ]);
      const taskAspectRatio =
        task.aspect_ratio && allowedAspectRatios.has(task.aspect_ratio)
          ? task.aspect_ratio
          : null;

      if (isPromptDebugEnabled() && taskAspectRatio) {
        // eslint-disable-next-line no-console
        console.log(
          `[ai] Gemini render aspectRatio for task ${task.id}: ${taskAspectRatio}`,
        );
      }

      const image = await renderImageWithGemini(
        (() => {
          const textBytes = Buffer.byteLength(finalPrompt, 'utf8');
          const imageBase64Bytes = inlineImages.reduce(
            (sum, img) => sum + Buffer.byteLength(img.data, 'utf8'),
            0,
          );
          const totalBytes = textBytes + imageBase64Bytes;

          if (isPromptDebugEnabled()) {
            // eslint-disable-next-line no-console
            console.log(
              `[ai] Gemini payload size for task ${task.id}: ` +
                `text=${textBytes} bytes, inlineImages=${imageBase64Bytes} bytes, total=${totalBytes}`,
            );
          }

          const MAX_GEMINI_PAYLOAD_BYTES_SOFT =
            Number(process.env.GEMINI_PAYLOAD_SOFT_BYTES) > 0
              ? Number(process.env.GEMINI_PAYLOAD_SOFT_BYTES)
              : 200_000;
          const MAX_GEMINI_PAYLOAD_BYTES_HARD =
            Number(process.env.GEMINI_PAYLOAD_HARD_BYTES) > 0
              ? Number(process.env.GEMINI_PAYLOAD_HARD_BYTES)
              : 500_000;

          if (totalBytes > MAX_GEMINI_PAYLOAD_BYTES_HARD) {
            // eslint-disable-next-line no-console
            console.warn(
              `[ai] Gemini payload for task ${task.id} exceeds hard budget; ` +
                `falling back to text-only (total=${totalBytes} bytes).`,
            );
            return { prompt: finalPrompt, aspectRatio: taskAspectRatio };
          }

          if (totalBytes > MAX_GEMINI_PAYLOAD_BYTES_SOFT) {
            // eslint-disable-next-line no-console
            console.warn(
              `[ai] Gemini payload for task ${task.id} exceeds soft budget: total=${totalBytes} bytes`,
            );
          }

          if (inlineImages.length > 0) {
            return {
              prompt: finalPrompt,
              inlineImages,
              inlineImageTexts,
              aspectRatio: taskAspectRatio,
            };
          }

          return { prompt: finalPrompt, aspectRatio: taskAspectRatio };
        })(),
      );

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
        referenceConstraintDefinitionId:
          referenceConstraintDefinition?.id ?? null,
        referenceConstraintMetadata: referenceConstraintMeta ?? null,
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

      const updatedAspectRatio =
        updatedTask?.aspect_ratio &&
        typeof updatedTask.aspect_ratio === 'string'
          ? updatedTask.aspect_ratio
          : null;
      const updatedSfx = toTaskBubbleMetadataWire(
        (updatedTask as any).sfx_metadata,
      );
      const updatedSpeech = toTaskBubbleMetadataWire(
        (updatedTask as any).speech_metadata,
      );
      const updatedThought = toTaskBubbleMetadataWire(
        (updatedTask as any).thought_metadata,
      );

      const signedAsset = maybeSignAssetUrl(asset);

      res.status(201).json({
        task: {
          ...updatedTask,
          aspect_ratio: updatedAspectRatio,
          aspectRatio: updatedAspectRatio,
          sfxMetadata: updatedSfx,
          speechMetadata: updatedSpeech,
          thoughtMetadata: updatedThought,
        },
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
