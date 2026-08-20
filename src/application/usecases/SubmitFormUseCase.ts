import logger from '../../server/logging/logger';
import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { IDataObject } from '../../core/domains/interface/types';
import {
    checkDuplicate,
    createRecord,
    getBoardById
} from '../../core/repositories/boards.repository';
import { getOrgInfo } from '../../core/repositories/account.repository';
import kafka from '../../kafka';
import { TOPIC_OUTGOING_MESSAGE } from '../../kafka/constant';
import _Error, { handleServiceError } from '../../utils/error';

export class SubmitFormUseCase {
    constructor(
        private formRepository: IFormRepository,
        private appRepository: IAppRepository
    ) { }

    async execute(data: any, formId: string, userContext?: IUserContext) {
        try {
            const { mode: requestMode, data: submitData } = data;
            const mode = requestMode === '_id' ? '_id' : 'field_name';

            // V1 match: Only find active forms. If not found, it's a 404
            const form = await this.formRepository.findById(formId);
            if (!form || !form.is_active) {
                throw new _Error('Form not found', 404);
            }

            const app = await this.appRepository.findById(form.app_id);
            if (!app || !app.is_active) {
                throw new _Error('App not found', 404);
            }

            // 1 & 2. Fill to Boards in parallel (Match V1 line 680-688)
            const [contactRecord, dataRecord] = await Promise.all([
                this.fillToContactBoard(form, submitData, mode, app),
                this.fillToDataBoard(form, submitData, mode)
            ]);

            // 3. Increment submitted count
            await this.formRepository.update(formId, { submitted_count: (form.submitted_count || 0) + 1 });

            // 4. Trigger workflow (Kafka)
            try {
                await this.triggerWorkflow(form, contactRecord, dataRecord, app);
            } catch (error) {
                logger.error('Error while triggering workflow', error);
            }

            return {
                message: 'Form submitted',
                data: {
                    contact_id: contactRecord?._id,
                    data_id: dataRecord?._id,
                },
            };
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private async fillToContactBoard(form: any, submitData: any, mode: string, app: any) {
        const mappedFields = form.map_to_contact || {};
        const contactData: any = {};

        // V1: Handle Name is required
        const nameFormField = form.fields.find((f: any) => f.name === 'Name' || f.field_name === 'name');
        if (nameFormField) {
            const nameToCheck = submitData[nameFormField[mode]];
            if (!nameToCheck) {
                throw new _Error('Name is required', 400);
            }
        }

        for (const [key, value] of Object.entries(mappedFields)) {
            const fieldId = value as string;
            if (!fieldId || !submitData[key]) continue;
            contactData[fieldId] = submitData[key];
        }

        // Handle origin
        const originFieldId = mappedFields['origin'] || mappedFields['source'];
        if (originFieldId) {
            contactData[originFieldId] = {
                type: 'journey',
                data: {
                    id: app.id,
                    name: app.title,
                    type: app.product_code,
                },
            };
        }

        // V1: Handle Phone duplicate check
        const phoneFormField = form.fields.find((f: any) => f.name === 'Phone' || f.field_name === 'phone');
        if (phoneFormField) {
            const phoneToCheck = submitData[phoneFormField[mode]];
            const phone = phoneToCheck?.calling_code_with_number;
            const contactBoardPhoneFieldId = mappedFields[phoneFormField._id || phoneFormField.id];

            if (phone && contactBoardPhoneFieldId) {
                const { exists, data } = await checkDuplicate(form.contact_board_id, {
                    limit: 1,
                    q: '',
                    matchingStrategy: 'all',
                    offset: 0,
                    filter: `fields.${contactBoardPhoneFieldId}.calling_code_with_number = '${phone}'`,
                });
                if (exists) return data;
            }
        }

        // V1: Handle Email duplicate check
        const emailFormField = form.fields.find((f: any) => f.name === 'Email' || f.field_name === 'email');
        if (emailFormField) {
            const emailToCheck = submitData[emailFormField[mode]];
            const contactBoardEmailFieldId = mappedFields[emailFormField._id || emailFormField.id];

            if (emailToCheck && contactBoardEmailFieldId) {
                const { exists, data } = await checkDuplicate(form.contact_board_id, {
                    limit: 1,
                    q: '',
                    matchingStrategy: 'all',
                    offset: 0,
                    filter: `fields.${contactBoardEmailFieldId} = '${emailToCheck}'`,
                });
                if (exists) return data;
            }
        }

        const createRecordPayload = Object.keys(contactData).map((fieldId) => ({
            board_field_id: fieldId,
            value: contactData[fieldId],
        }));

        return await createRecord(form.contact_board_id, createRecordPayload);
    }

    private async fillToDataBoard(form: any, submitData: any, mode: string) {
        const createRecordPayload: any[] = [];
        const dataBoard = await getBoardById(form.organization_id, form.data_board_id);

        form.fields.forEach((field: any) => {
            const key = mode === '_id' ? (field._id || field.id) : field.field_name;
            if (submitData[key]) {
                createRecordPayload.push({
                    board_field_id: field.field_id,
                    value: submitData[key],
                });
            }
        });

        // Add System Fields (Matches V1)
        const systemFields = [
            { name: 'Submission Source', value: `Form Management - ${form.name}` },
            { name: 'Submission Time', value: new Date().toISOString() },
            { name: 'Form Owner', value: form.owner?.user_id }
        ];

        for (const sys of systemFields) {
            const field = dataBoard.fields.find((f: any) => f.name === sys.name);
            if (field && sys.value) {
                createRecordPayload.push({ board_field_id: field._id, value: sys.value });
            }
        }

        return await createRecord(form.data_board_id, createRecordPayload);
    }

    private async triggerWorkflow(form: any, contactRecord: any, dataRecord: any, app: any) {
        const orgInfo = await getOrgInfo(form.organization_id);
        const partition = orgInfo.partition || 0;

        const message = {
            partition,
            value: JSON.stringify({
                app_id: app.id,
                workflow_id: app.workflow_id,
                contactRecord,
                dataRecord,
            }),
        };

        await kafka.send(TOPIC_OUTGOING_MESSAGE, [message]);
    }
}
