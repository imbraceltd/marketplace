/**
 * Read-only access to the `builtin_agents` Postgres table.
 *
 * The FE edit modal calls this when a user clicks Edit on a built-in template
 * card. The previous flow tried to GET the assistant from the Imbrace platform
 * (`/api/v3/ai/assistants/:id`), which 400s on `builtin-*` IDs because no row
 * exists in `openai_assistants`. After this lookup the FE has full assistant
 * config to prefill the form; on Save the FE forks via `createCustomUseCaseV2`.
 */

import { eq } from 'drizzle-orm';
import _Error, { handleServiceError } from '../../utils/error';
import { getPgDb, pgBuiltinAgents } from '../../infrastructure/database/drizzle';

export const getBuiltinAssistantById = async (assistantId: string) => {
  try {
    if (!assistantId || !assistantId.startsWith('builtin-')) {
      throw new _Error('Invalid builtin assistant id', 400);
    }
    const rows = await getPgDb()
      .select()
      .from(pgBuiltinAgents)
      .where(eq(pgBuiltinAgents.assistant_id, assistantId))
      .limit(1);
    if (rows.length === 0) {
      throw new _Error(`Builtin assistant ${assistantId} not found`, 404);
    }
    const { id, ...rest } = rows[0];
    return { _id: id, ...rest };
  } catch (error) {
    throw handleServiceError(error);
  }
};
