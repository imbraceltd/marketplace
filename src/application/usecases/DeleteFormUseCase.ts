import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';
import { getBoardById, updateBoard } from '../../core/repositories/boards.repository';

export class DeleteFormUseCase {
    constructor(private formRepository: IFormRepository) { }

    async execute(userContext: IUserContext, formId: string): Promise<any> {
        try {
            const { org_id } = userContext;
            if (!org_id) {
                throw new _Error('Unauthorized', 401);
            }

            const form = await this.formRepository.findById(formId);
            if (!form) {
                throw new _Error('Form not found', 404);
            }

            if (form.organization_id !== org_id) {
                throw new _Error('Form not found', 404);
            }

            const boardId = form.data_board_id;

            await this.formRepository.delete(formId);

            // Match V1 logic: check if any other form is using this board
            if (boardId) {
                const formsUsingBoard = await this.formRepository.search(org_id, { data_board_id: boardId });

                if (formsUsingBoard.data.length === 0) {
                    const board = await getBoardById(org_id, boardId);
                    if (board && board.type === 'System') {
                        await updateBoard(org_id, boardId, {
                            ...board,
                            type: 'General',
                            organization_id: org_id,
                            close_default_field: true
                        });
                    }
                }
            }

            return { message: 'Form deleted' };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
