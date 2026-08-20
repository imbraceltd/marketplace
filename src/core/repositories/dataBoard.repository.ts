import axios from 'axios';
import config from '../../config';

const dataBoardHost = () => config.dataBoard.host;

// Service-to-service call: org identity travels in the header, matching the
// data-board context middleware which reads `x-organization-id`.
const orgHeaders = (orgId: string) => ({ 'x-organization-id': orgId });

/**
 * Prune a deleted assistant's id from every doc-schema's `agent_ids` in the
 * org. Assistants live in the AI service, so data-board can't detect the
 * deletion itself — this orchestrator tells it after the assistant is gone.
 *
 * No-op (resolves to 0) when DATA_BOARD_HOST isn't configured, so the cleanup
 * stays optional per environment and never breaks assistant deletion.
 */
export const unlinkAssistantFromAllSchemas = async (
  orgId: string,
  assistantId: string
): Promise<number> => {
  const host = dataBoardHost();
  if (!host) {
    console.warn('unlinkAssistantFromAllSchemas skipped: DATA_BOARD_HOST not set');
    return 0;
  }
  try {
    const { data } = await axios.post(
      `${host}/api/schemas/_unlink-assistant-from-all-schemas`,
      { assistant_id: assistantId },
      { headers: orgHeaders(orgId) }
    );
    return data?.unlinked ?? 0;
  } catch (error) {
    console.log('unlinkAssistantFromAllSchemas', { error });
    throw error;
  }
};
