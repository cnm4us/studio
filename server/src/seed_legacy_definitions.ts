import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import { getDbPool } from './db.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const numberFromEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getGraphicsPool = (): Pool => {
  const host =
    process.env.GRAPHICS_DB_HOST ??
    process.env.DB_HOST ??
    '127.0.0.1';
  const port = numberFromEnv(
    'GRAPHICS_DB_PORT',
    numberFromEnv('DB_PORT', 3306),
  );
  const user = process.env.GRAPHICS_DB_USER ?? process.env.DB_USER;
  const password =
    process.env.GRAPHICS_DB_PASSWORD ?? process.env.DB_PASSWORD;
  const database = process.env.GRAPHICS_DB_NAME ?? 'graphics';

  if (!user || !database) {
    throw new Error(
      'Missing GRAPHICS_DB_USER/GRAPHICS_DB_PASSWORD or GRAPHICS_DB_NAME for graphics connection (falling back to DB_USER/DB_PASSWORD if GRAPHICS_* not set).',
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed] Connecting to graphics DB at ${host}:${port}/${database} as ${user}`,
  );

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });
};

const getSeedSpaceId = (): number => {
  const raw = process.env.SEED_SPACE_ID;
  if (!raw) {
    throw new Error(
      'SEED_SPACE_ID is not set. Create a Space in Studio and set SEED_SPACE_ID to its id before running the seed.',
    );
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('SEED_SPACE_ID must be a positive integer.');
  }
  return parsed;
};

const seedCharacters = async (
  graphicsDb: Pool,
  studioDb: Pool,
  spaceId: number,
): Promise<void> => {
  // Latest character_versions per character_id.
  const [rows] = await graphicsDb.query(`
    SELECT cv.*
    FROM character_versions cv
    JOIN (
      SELECT character_id, MAX(version_number) AS max_version
      FROM character_versions
      GROUP BY character_id
    ) latest
      ON latest.character_id = cv.character_id
     AND latest.max_version = cv.version_number
  `);

  const versions = rows as Array<{
    id: number;
    character_id: number;
    version_number: number;
    label: string | null;
    identity_summary: string | null;
    appearance_json: string;
  }>;

  if (versions.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[seed] No character_versions found in graphics DB.');
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Found ${versions.length} character_versions to seed.`);

  for (const v of versions) {
    let appearance: any;
    try {
      appearance = v.appearance_json
        ? JSON.parse(v.appearance_json)
        : {};
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `[seed] Skipping character_version id=${v.id} due to invalid appearance_json:`,
        error,
      );
      continue;
    }

    const name =
      v.label ||
      (appearance?.core_identity?.name as string | undefined) ||
      `Character #${v.character_id}`;
    const description = v.identity_summary || null;

    const [insertResult] = await studioDb.query(
      `INSERT INTO definitions (type, scope, space_id, name, description, state, metadata)
       VALUES ('character', 'space', ?, ?, ?, 'canonical', ?)`,
      [spaceId, name, description, JSON.stringify(appearance)],
    );

    const insertInfo = insertResult as { insertId?: number };
    const id = insertInfo.insertId;
    if (id) {
      await studioDb.query('UPDATE definitions SET root_id = ? WHERE id = ?', [
        id,
        id,
      ]);
    }
  }
};

const seedStyles = async (
  graphicsDb: Pool,
  studioDb: Pool,
  spaceId: number,
): Promise<void> => {
  // Latest style_versions per style_id.
  const [rows] = await graphicsDb.query(`
    SELECT sv.*
    FROM style_versions sv
    JOIN (
      SELECT style_id, MAX(version_number) AS max_version
      FROM style_versions
      GROUP BY style_id
    ) latest
      ON latest.style_id = sv.style_id
     AND latest.max_version = sv.version_number
  `);

  const versions = rows as Array<{
    id: number;
    style_id: number;
    version_number: number;
    label: string | null;
    style_definition_json: string;
  }>;

  if (versions.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[seed] No style_versions found in graphics DB.');
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Found ${versions.length} style_versions to seed.`);

  for (const v of versions) {
    let styleDef: any;
    try {
      styleDef = v.style_definition_json
        ? JSON.parse(v.style_definition_json)
        : {};
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `[seed] Skipping style_version id=${v.id} due to invalid style_definition_json:`,
        error,
      );
      continue;
    }

    const name =
      v.label ||
      (styleDef?.core_style?.render_domain as string | undefined) ||
      `Style #${v.style_id}`;
    const description = null;

    const [insertResult] = await studioDb.query(
      `INSERT INTO definitions (type, scope, space_id, name, description, state, metadata)
       VALUES ('style', 'space', ?, ?, ?, 'canonical', ?)`,
      [spaceId, name, description, JSON.stringify(styleDef)],
    );

    const insertInfo = insertResult as { insertId?: number };
    const id = insertInfo.insertId;
    if (id) {
      await studioDb.query('UPDATE definitions SET root_id = ? WHERE id = ?', [
        id,
        id,
      ]);
    }
  }
};

const run = async (): Promise<void> => {
  const spaceId = getSeedSpaceId();
  const graphicsDb = getGraphicsPool();
  const studioDb = getDbPool();

  // eslint-disable-next-line no-console
  console.log(`[seed] Seeding legacy characters and styles into space_id=${spaceId}`);

  await seedCharacters(graphicsDb, studioDb, spaceId);
  await seedStyles(graphicsDb, studioDb, spaceId);

  // eslint-disable-next-line no-console
  console.log('[seed] Seeding complete.');
  await graphicsDb.end();
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Seed failed:', error);
  process.exitCode = 1;
});
