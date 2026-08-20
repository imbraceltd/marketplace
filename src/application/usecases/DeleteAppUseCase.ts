import logger from '../../server/logging/logger';
import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { AppType, IApp } from '../../core/domains/interface/app';
import { FormRepositoryFactory } from '../../infrastructure/repositories/factories/FormRepositoryFactory';
import { getBoards, updateBoard } from '../../core/repositories/boards.repository';
import { deleteSchedulersByAppId } from '../../core/repositories/scheduler.repository';
import { deleteAssistants, getWorkflowsRelatedToAssistant } from '../../core/repositories/ai.repository';
import { unlinkAssistantFromAllSchemas } from '../../core/repositories/dataBoard.repository';
import _Error, { handleServiceError } from '../../utils/error';

export class DeleteAppUseCase {
    constructor(private repository: IAppRepository) { }

    async execute(userContext: IUserContext, id: string): Promise<any> {
        try {
            const { org_id } = userContext;

            // 1. Find the app and check existence/ownership
            const app = await this.repository.findById(id);
            if (!app) {
                throw new _Error('App not found', 400);
            }

            if (app.organization_id !== org_id) {
                throw new _Error('App not found', 400);
            }

            // 2. Check if it's a customization app (Prevention deletion logic from v1)
            if (app.app_type === AppType.CustomizationApp) {
                throw new _Error('Can not delete customized app', 400);
            }

            // 3. AI app deletion logic (pre-process assistants if necessary)
            let deletedAssistantIds: string[] = [];
            if (app.product_type === 'ai_assistant' || app.channel?.channel_type === 'openai') {
                try {
                    // Get workflows and assistants
                    const relatedResources = await getWorkflowsRelatedToAssistant(org_id);
                    // assistants
                    const assistantIds = relatedResources.map((resource) => resource.assistant_id);

                    // delete assistants
                    deletedAssistantIds = await deleteAssistants(org_id, assistantIds);
                } catch (error) {
                    logger.error('Error deleting AI assistants', error);
                    throw handleServiceError(error);
                }

                // Prune each deleted assistant from data-board doc-schemas so
                // their agent_ids don't dangle. Best-effort — never blocks the
                // app deletion if data-board is unreachable.
                await Promise.all(
                    deletedAssistantIds.map(async (assistantId) => {
                        try {
                            await unlinkAssistantFromAllSchemas(org_id, assistantId);
                        } catch (err) {
                            console.error('Failed to unlink assistant from data-board schemas, continuing:', err);
                        }
                    })
                );
            }

            // 4. Delete related resources (following _deleteRelatedResources from v1)
            if (app.product_code === 'form_management') {
                const formRepository = FormRepositoryFactory.create();
                const forms = await formRepository.deleteByOrganizationId(org_id);

                // Update boards from 'System' to 'General' (matching v1 logic)
                const boardIds = forms.map((form: any) => form.data_board_id || form.board_id).filter(Boolean);
                if (boardIds.length > 0) {
                    const boards = await getBoards(org_id);
                    const systemBoards = boards.filter((board: any) =>
                        boardIds.includes(board._id as string) && board.type === 'System'
                    );
                    await Promise.all(
                        systemBoards.map((board: any) =>
                            updateBoard(org_id, board._id as string, {
                                name: board.name,
                                type: 'General',
                                organization_id: board.organization_id,
                            })
                        )
                    );
                }
            }
            await deleteSchedulersByAppId(org_id, id);

            // 5. Delete app from database
            await this.repository.delete(id);

            return {
                app_id: id,
                assistant_id: deletedAssistantIds
            };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
