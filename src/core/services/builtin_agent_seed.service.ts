import logger from '../../server/logging/logger';
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getPgDb, pgBuiltinAgents } from '../../infrastructure/database/drizzle';

const SEED_DIR = path.join(__dirname, 'builtin-agents');

interface SeedDoc {
  _id: string;
  assistant_id: string;
  version: number;
  [key: string]: unknown;
}

function readSeedFiles(): SeedDoc[] {
  if (!fs.existsSync(SEED_DIR)) {
    logger.warn(`[builtin-agent-seed] dir not found: ${SEED_DIR}`);
    return [];
  }
  const files = fs.readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
  return files.map((file) => {
    const content = fs.readFileSync(path.join(SEED_DIR, file), 'utf-8');
    return JSON.parse(content) as SeedDoc;
  });
}

/**
 * Upsert each built-in agent JSON into `builtin_agents`.
 * Reason: only re-write the row when the seed's `version` is strictly greater
 * than what's already in DB, so manual DB edits during testing aren't blown
 * away on every server restart.
 */
export async function seedBuiltinAgents(): Promise<void> {
  if (process.env.BUILTIN_SEED_ON_BOOT === 'false') {
    logger.info('[builtin-agent-seed] disabled via env');
    return;
  }

  const seeds = readSeedFiles();
  if (seeds.length === 0) {
    logger.info('[builtin-agent-seed] no seed files found');
    return;
  }

  const db = getPgDb();
  for (const seed of seeds) {
    if (!seed.assistant_id) {
      logger.warn('[builtin-agent-seed] skipped: missing assistant_id', seed);
      continue;
    }
    try {
      const existing = await db
        .select({ version: pgBuiltinAgents.version })
        .from(pgBuiltinAgents)
        .where(eq(pgBuiltinAgents.assistant_id, seed.assistant_id))
        .limit(1);

      const existingVersion = existing[0]?.version ?? 0;
      if (existing.length > 0 && seed.version <= existingVersion) {
        logger.info(
          `[builtin-agent-seed] skipped ${seed.assistant_id} (version ${existingVersion} unchanged)`
        );
        continue;
      }

      const { _id, created_at, updated_at, ...rest } = seed as SeedDoc & {
        created_at?: unknown;
        updated_at?: unknown;
      };
      void created_at;
      void updated_at;
      const now = new Date();
      const row = { id: _id, ...rest, updated_at: now } as typeof pgBuiltinAgents.$inferInsert;

      if (existing.length === 0) {
        await db.insert(pgBuiltinAgents).values({ ...row, created_at: now });
      } else {
        await db
          .update(pgBuiltinAgents)
          .set(row)
          .where(eq(pgBuiltinAgents.assistant_id, seed.assistant_id));
      }
      logger.info(
        `[builtin-agent-seed] upserted ${seed.assistant_id} v=${seed.version}`
      );
    } catch (err) {
      logger.error(
        `[builtin-agent-seed] failed for ${seed.assistant_id}:`,
        err
      );
    }
  }
}
