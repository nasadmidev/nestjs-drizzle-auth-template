import * as schema from './schema';
import { defineRelations } from 'drizzle-orm';

// Relations for Drizzle ORM
// Note: This file is a placeholder for future relation definitions
// The current version of drizzle-orm (1.0.0-rc.4) may have a different API for relations
// TODO: Implement relations when the API is stable

export const relations = defineRelations(schema, (r) => ({
  refreshTokens: {
    refreshTokens_userId: r.one.users({
      from: r.refreshTokens.userId,
      to: r.users.id,
    }),
  },
}));
