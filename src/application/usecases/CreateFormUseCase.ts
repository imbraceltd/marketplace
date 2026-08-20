import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { Form } from '../../domain/entities/Form';
import {
    getBoardById,
    getBoards,
    createOrUpdateBoardV2
} from '../../core/repositories/boards.repository';
import { getTeamById } from '../../core/repositories/team_users';
import _Error, { handleServiceError } from '../../utils/error';

export class CreateFormUseCase {
    constructor(
        private formRepository: IFormRepository,
        private appRepository: IAppRepository
    ) { }

    async execute(userContext: IUserContext, formData: any): Promise<Form> {
        try {
            const { org_id, user_id } = userContext;
            if (!org_id || !user_id) {
                throw new _Error('Unauthorized', 401);
            }

            const { app_id } = formData;
            if (!app_id) {
                throw new _Error('App ID is required', 400); // v1 matching
            }

            // 1. Validation (Matching v1)
            if (!formData.name) {
                throw new _Error('Form name is required', 400);
            }
            if (!formData.fields || formData.fields.length === 0) {
                throw new _Error('Form fields are required', 400);
            }

            // 1. Fetch dependencies in parallel (Matching v1 Promise.all)
            const [app, contactDataBoard, acl] = await Promise.all([
                this.appRepository.findById(app_id),
                this.findContactBoard(org_id),
                this.getACL(org_id, formData)
            ]);

            if (!app) {
                throw new _Error('App not found', 404);
            }

            if (!contactDataBoard) {
                throw new _Error('Contact data board not found', 404);
            }

            // 2. Setup initial Form data
            const newFormPayload = {
                ...formData,
                organization_id: org_id,
                created_by: user_id,
                owner: acl.owner,
                teams: acl.teams,
                contact_board_id: contactDataBoard._id,
            };

            return await this.formRepository.create(newFormPayload);
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private async findContactBoard(org_id: string) {
        const boards = await getBoards(org_id);
        return boards.find((b: any) => b.name === 'Contacts');
    }

    private async getACL(org_id: string, form: any) {
        let teams: { team_id: string; team_name: string }[] = [];
        if (form.teams && Array.isArray(form.teams)) {
            const teamInfos = await Promise.all(
                form.teams.map((teamId: string) => getTeamById(org_id, teamId))
            );
            teams = teamInfos
                .map((info, index) => info ? { team_id: form.teams[index], team_name: info.name } : null)
                .filter((t): t is { team_id: string; team_name: string } => !!t);
        }
        return {
            teams,
            owner: form.owner || { user_id: '', user_name: '' }
        };
    }
}
