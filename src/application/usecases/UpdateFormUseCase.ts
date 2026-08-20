import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { notAllowToOverrideFields } from '../../core/domains/interface/form';
import _Error, { handleServiceError } from '../../utils/error';
import {
    getBoards,
    createOrUpdateBoardV2
} from '../../core/repositories/boards.repository';
import { getTeamById } from '../../core/repositories/team_users';

export class UpdateFormUseCase {
    constructor(
        private formRepository: IFormRepository,
        private appRepository: IAppRepository
    ) { }

    async execute(userContext: IUserContext, formId: string, formData: any): Promise<any> {
        try {
            const { org_id, user_id } = userContext;
            if (!org_id) {
                throw new _Error('Unauthorized', 401);
            }

            const formInDb = await this.formRepository.findById(formId);
            if (!formInDb) {
                throw new _Error('Form not found', 404);
            }

            if (formInDb.organization_id !== org_id) {
                throw new _Error('Form not found', 404);
            }

            // Fetch dependencies in parallel
            const [app, contactDataBoard, acl] = await Promise.all([
                this.appRepository.findById(formInDb.app_id),
                this.findContactBoard(org_id),
                this.getACL(org_id, formData)
            ]);

            if (!app) {
                throw new _Error('App not found', 404);
            }

            if (!contactDataBoard) {
                throw new _Error('Contact data board not found', 404);
            }

            // 1. Prepare data to update
            const canUpdateData: any = {};
            Object.keys(formData).forEach((key) => {
                if (!notAllowToOverrideFields.includes(key)) {
                    canUpdateData[key] = formData[key];
                }
            });

            if (canUpdateData.fields) {
                canUpdateData.fields = canUpdateData.fields.map((field: any) => {
                    const matchedField = formInDb.fields?.find((f: any) => f.name === field.name);
                    return {
                        ...field,
                        field_id: matchedField?.field_id || matchedField?._id,
                        settings: matchedField?.settings,
                    };
                });
            }

            const upcomingForm = {
                ...formInDb.toDatabase(),
                ...canUpdateData,
                teams: acl.teams,
                owner: acl.owner,
                updated_at: new Date(),
            };

            // 2. Sync Databoard
            const boardTemplate = {
                boardName: upcomingForm.name,
                name: upcomingForm.name,
                organization_id: org_id,
                type: upcomingForm.is_system ? 'System' : 'General',
                fields: upcomingForm.fields,
                team_ids: upcomingForm.teams?.map((t: any) => t.team_id) || []
            };

            const board = await createOrUpdateBoardV2(org_id, boardTemplate);

            // 3. Decorate fields from Board
            upcomingForm.fields = upcomingForm.fields.map((field: any) => {
                const matchedField = board.fields.find((f: any) => f.name === field.name);
                if (matchedField) {
                    return {
                        ...field,
                        field_id: matchedField._id,
                        settings: matchedField.settings,
                        field_name: field.name.toString().toLowerCase().replace(/ /g, '_')
                    };
                }
                return field;
            });

            // 4. Decorate from Contact Board
            upcomingForm.fields = upcomingForm.fields.map((field: any) => {
                const matchedField = contactDataBoard.fields.find((f: any) => f.name === field.name);
                if (matchedField) {
                    return {
                        ...field,
                        settings: matchedField.settings
                    };
                }
                return field;
            });

            // 5. Sync map_to_contact
            const contactFieldMap = this.createContactFieldMap(contactDataBoard, upcomingForm);
            upcomingForm.map_to_contact = contactFieldMap;
            upcomingForm.contact_board_id = contactDataBoard._id;
            upcomingForm.board_name = upcomingForm.board_name || upcomingForm.name;

            const updatedFormEntity = await this.formRepository.update(formId, upcomingForm);
            if (!updatedFormEntity) {
                throw new _Error('Form not found', 404);
            }

            return updatedFormEntity.toJSON({ includeMapToContact: true });
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private async findContactBoard(org_id: string) {
        const boards = await getBoards(org_id);
        return boards.find((b: any) => b.name === 'Contacts');
    }

    private async getACL(org_id: string, form: any) {
        let teams: { team_id: string, team_name: string }[] = [];
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

    private createContactFieldMap(contactDataBoard: any, form: any) {
        const fieldMap: { [key: string]: string } = {};
        const mapOfContactDefaultFieldNameAndFormFieldName: { [key: string]: string } = {
            name: 'name',
            position: 'title',
            company: 'company',
            phone: 'phone',
            email: 'email',
            location: 'location',
            origin: 'source',
        };

        const contactFillableFields = ['name', 'position', 'company', 'phone', 'email', 'location', 'origin'];

        contactFillableFields.forEach((field) => {
            const matchedField = contactDataBoard.fields.find((f: any) => f.default_field_name === field || f.name.toLowerCase() === field.toLowerCase());

            if (field === 'origin') {
                if (matchedField) fieldMap[field] = matchedField._id;
                return;
            }

            const fieldInForm = form.fields.find((f: any) => {
                const nameInForm = (f.field_name || '').toLowerCase();
                const expectedName = mapOfContactDefaultFieldNameAndFormFieldName[field].toLowerCase();
                return nameInForm === expectedName || f.name.toLowerCase() === expectedName;
            });

            if (matchedField && fieldInForm) {
                const formFieldId = fieldInForm._id || fieldInForm.field_id;
                if (formFieldId) {
                    fieldMap[formFieldId] = matchedField._id;
                }
            }
        });

        return fieldMap;
    }
}
