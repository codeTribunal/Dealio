import { PrismaClient } from '@prisma/client';
import { injectNotDeleted } from './softDeleteFilter.js';

/**
 * Soft-delete enforcement.
 *
 * Models with a `deletedAt` column (see SOFT_DELETE_MODELS in softDeleteFilter)
 * must hide deleted rows from ordinary reads. Instead of hand-adding
 * `deletedAt: null` to every query — fragile, one omission leaks deleted rows —
 * a single client extension injects it into the WHERE of the multi-row read
 * operations below for those models.
 *
 * Scope / limitations (read before relying on this):
 *  - Covers top-level reads: findMany, findFirst, findFirstOrThrow, count,
 *    aggregate, groupBy.
 *  - Does NOT touch findUnique / findUniqueOrThrow — their WHERE accepts only
 *    unique identifiers, so `deletedAt` can't be merged in. The few callers
 *    that fetch a soft-deletable row by unique key must check `deletedAt`
 *    themselves. (Today only bot.ts looks a Customer up by unique key, and
 *    nothing soft-deletes customers yet, so it is currently moot.)
 *  - Does NOT filter nested relation reads via include/select — Prisma applies
 *    an extension only to the top-level operation. To-many includes of a
 *    soft-deletable relation must still add `where: { deletedAt: null }` by
 *    hand (existing milestone includes already do).
 *  - Does NOT filter relation `_count` — counts may include deleted rows.
 *  - Writes (update/updateMany/delete/...) are untouched, so the soft-delete
 *    helpers in services/softDelete.ts work normally.
 *
 * Opt-in to SEE deleted rows: set `deletedAt` explicitly in the query's where
 * (never overridden), or use `prismaUnscoped` below for the full unfiltered
 * client.
 */

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };

const base =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaBase = base;

/**
 * Un-extended client — returns soft-deleted rows too. Use ONLY where seeing
 * deleted data is the explicit intent (e.g. a future admin "view deleted" /
 * restore / hard-delete tool). All ordinary code must use `prisma`.
 */
export const prismaUnscoped = base;

export const prisma = base.$extends({
  name: 'softDelete',
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        return query(injectNotDeleted(model, args) as typeof args);
      },
      async findFirst({ model, args, query }) {
        return query(injectNotDeleted(model, args) as typeof args);
      },
      async findFirstOrThrow({ model, args, query }) {
        return query(injectNotDeleted(model, args) as typeof args);
      },
      async count({ model, args, query }) {
        return query(injectNotDeleted(model, args) as typeof args);
      },
      async aggregate({ model, args, query }) {
        return query(injectNotDeleted(model, args) as typeof args);
      },
      async groupBy({ model, args, query }) {
        return query(injectNotDeleted(model, args) as typeof args);
      },
    },
  },
});
