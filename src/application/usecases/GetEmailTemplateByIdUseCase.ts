import { IEmailTemplateRepository } from '../interfaces/repositories/IEmailTemplateRepository';
import { getBoards } from '../../core/repositories/boards.repository';
import _Error, { handleServiceError } from '../../utils/error';

export class GetEmailTemplateByIdUseCase {
    constructor(
        private repository: IEmailTemplateRepository
    ) { }

    async execute(userContext: any, id: string) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const template = await this.repository.findById(id);

            if (!template || template.organization_id !== organizationId) {
                throw new _Error('Email template not found', 404);
            }

            const json = template.toJSON();

            // Add board name
            if (json.board_id) {
                const allBoards = await getBoards(organizationId);
                const board = allBoards.find(b => b._id === json.board_id);
                if (board) json.board_name = board.name;
            }

            return json;
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
