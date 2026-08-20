import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import { getBoardById, getBoards, searchRecords, createBoardField, updateBoardField } from '../../core/repositories/boards.repository';
import _Error, { handleServiceError, ErrorCode } from '../../utils/error';
import { Field } from '../../core/domains/interface/databoard';

export class HandleSubscriptionV2UseCase {
    async execute(body: { app_id: string; email: string; opt_in?: boolean; source?: string }): Promise<any> {
        try {
            const { email, source, opt_in: subscribe = true, app_id } = body;
            if (!app_id) throw new _Error('App id is required', 400);

            // Get app via repository
            const repository = AppRepositoryFactory.create();
            const app = await repository.findById(app_id);
            if (!app) throw new _Error('App not found', 404, ErrorCode.app_not_found);

            const emailRegex = /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/;
            if (!email || !email.match(emailRegex))
                throw new _Error('Email is required', 400, ErrorCode.missing_email);

            const CONTACTS_TABLE = 'Contacts';
            const allBoards = await getBoards(app.organization_id);
            const contactsDataboard = allBoards.find((board: any) => board.name === CONTACTS_TABLE);

            if (!contactsDataboard) throw new _Error('Contacts Data Board not found', 404);

            const emailField = contactsDataboard.fields.find((field: Field) => field.name === 'Email');
            if (!emailField) throw new _Error('Email field not found', 404);

            const subscriptionField = contactsDataboard.fields.find((field: Field) => field.name === 'Opt-Out Status');
            if (!subscriptionField) throw new _Error('Subscription field not found', 404);

            const sourceField = contactsDataboard.fields.find((field: Field) => field.name === 'Origin');

            const identifierField = contactsDataboard.fields.find((field: Field) => field.is_identifier === true);
            if (!identifierField) throw new _Error('Identifier field not found', 404);

            const { message, success } = await searchRecords(contactsDataboard._id as string, {
                limit: 20,
                matchingStrategy: 'all',
                offset: 0,
                filter: `fields.${emailField._id} = '${email}'`,
            });

            if (!success) throw new _Error(message, 500);

            if (message.hits.length === 0 && !subscribe) {
                throw new _Error('Email not found', 400, ErrorCode.email_opt_out_not_found);
            }

            if (message.hits.length === 0) {
                const fields: any[] = [
                    { board_field_id: emailField._id as string, value: email },
                    { board_field_id: subscriptionField._id as string, value: subscribe ? 'Opt-in' : 'Opt-out' },
                    { board_field_id: identifierField._id as string, value: email },
                ];

                if (source && source !== '' && sourceField) {
                    fields.push({ board_field_id: sourceField._id as string, value: source });
                }

                return await createBoardField(contactsDataboard._id as string, fields);
            }

            if (message.hits.length !== 0) {
                const record = message.hits[0];
                const fields = [
                    { key: subscriptionField._id as string, value: subscribe ? 'Opt-in' : 'Opt-out' },
                ];
                return await updateBoardField(contactsDataboard._id as string, record._id, fields);
            }

            throw new _Error('Email not found', 404);
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
