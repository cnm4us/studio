import type { Request, Response } from 'express';
import express from 'express';
import multer from 'multer';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import type { PublicUser } from './auth_service.js';
import { attachUserFromToken, requireAuth } from './auth_routes.js';
import {
  createSpaceAsset,
  deleteSpaceAsset,
  listSpaceAssets,
} from './space_assets_service.js';
import { getDbPool } from './db.js';

type AuthedRequest = Request & { user?: PublicUser };

type SpaceRecord = {
  id: number;
  user_id: number;
};

type SpaceAssetDto = {
  id: number;
  spaceId: number;
  name: string;
  type: string;
  fileKey: string;
  fileUrl: string;
  metadata: unknown | null;
  createdAt: string;
};

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

const maybeSignSpaceAssetUrl = (row: {
  file_key: string;
  file_url: string;
}): string => {
  const domain = process.env.CF_DOMAIN;
  const keyPairId = process.env.CF_KEY_PAIR_ID;
  const privateKey = process.env.CF_PRIVATE_KEY_PEM;

  if (!domain || !keyPairId || !privateKey) {
    return row.file_url;
  }

  const trimmedDomain = domain.replace(/\/+$/, '');
  const baseUrl = `https://${trimmedDomain}/${row.file_key}`;

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
      '[space-assets] Failed to sign CloudFront URL; falling back to plain URL:',
      error,
    );
    return baseUrl;
  }
};

const mapSpaceAsset = (row: {
  id: number;
  space_id: number;
  name: string;
  type: string;
  file_key: string;
  file_url: string;
  metadata: unknown | null;
  created_at: Date;
}): SpaceAssetDto => ({
  id: row.id,
  spaceId: row.space_id,
  name: row.name,
  type: row.type,
  fileKey: row.file_key,
  fileUrl: maybeSignSpaceAssetUrl(row),
  metadata: row.metadata ?? null,
  createdAt: row.created_at.toISOString(),
});

const router = express.Router({ mergeParams: true });
const upload = multer();

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

router.get(
  '/',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const space = await loadOwnedSpaceOr404(req, res);
    if (!space) {
      return;
    }

    const { type } = req.query as { type?: string };

    try {
      const assets = await listSpaceAssets(space.id, type);
      res.status(200).json({
        assets: assets.map((asset) => mapSpaceAsset(asset as any)),
      });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[space-assets] List assets error:', error);
      res.status(500).json({ error: 'SPACE_ASSETS_LIST_FAILED' });
    }
  },
);

router.post(
  '/',
  upload.single('file'),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const space = await loadOwnedSpaceOr404(req, res);
    if (!space) {
      return;
    }

    const file = (req as any).file as
      | {
          originalname: string;
          mimetype: string;
          buffer: Buffer;
        }
      | undefined;

    const { name, type } = req.body as {
      name?: string;
      type?: string;
    };

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'NAME_REQUIRED' });
      return;
    }

    if (!type || type.trim().length === 0) {
      res.status(400).json({ error: 'TYPE_REQUIRED' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'FILE_REQUIRED' });
      return;
    }

    const trimmedName = name.trim();
    const trimmedType = type.trim();

    // Validate type against the enum used in the DB schema.
    const allowedTypes = new Set([
      'character_face',
      'character_body',
      'character_hair',
      'character_full',
      'character_prop',
      'character_clothing',
      'scene_reference',
      'style_reference',
    ]);

    if (!allowedTypes.has(trimmedType)) {
      res.status(400).json({ error: 'INVALID_ASSET_TYPE' });
      return;
    }

    try {
      // Use the same S3 helper as rendered assets.
      const timestamp = Date.now();
      const safeBaseName =
        file.originalname && file.originalname.trim().length > 0
          ? file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
          : 'asset.bin';
      const key = `spaces/${space.id}/assets/${timestamp}_${safeBaseName}`;

      const { uploadImageToS3 } = await import('./s3_client.js');
      const uploadResult = await uploadImageToS3(
        key,
        file.buffer,
        file.mimetype || 'application/octet-stream',
      );

      const metadata = {
        mimeType: file.mimetype,
        originalFileName: file.originalname,
      };

      const asset = await createSpaceAsset({
        spaceId: space.id,
        name: trimmedName,
        type: trimmedType,
        fileKey: uploadResult.key,
        fileUrl: uploadResult.url,
        metadata,
      });

      if (!asset) {
        res.status(500).json({ error: 'SPACE_ASSET_CREATE_FAILED' });
        return;
      }

      res.status(201).json({ asset: mapSpaceAsset(asset as any) });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[space-assets] Upload asset error:', error);
      res.status(500).json({ error: 'SPACE_ASSET_UPLOAD_FAILED' });
    }
  },
);

router.delete(
  '/:assetId',
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const space = await loadOwnedSpaceOr404(req, res);
    if (!space) {
      return;
    }

    const { assetId } = req.params as { assetId?: string };
    const numericAssetId = assetId ? Number(assetId) : NaN;
    if (!Number.isFinite(numericAssetId) || numericAssetId <= 0) {
      res.status(400).json({ error: 'INVALID_ASSET_ID' });
      return;
    }

    try {
      const deleted = await deleteSpaceAsset(space.id, numericAssetId);
      if (!deleted) {
        res.status(404).json({ error: 'SPACE_ASSET_NOT_FOUND' });
        return;
      }

      res.status(204).end();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[space-assets] Delete asset error:', error);
      res.status(500).json({ error: 'SPACE_ASSET_DELETE_FAILED' });
    }
  },
);

export { router as spaceAssetsRouter };
