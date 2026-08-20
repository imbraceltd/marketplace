import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import { getBoardById, searchRecords, createBoardField, updateBoardField } from '../../core/repositories/boards.repository';
import _Error, { handleServiceError, ErrorCode } from '../../utils/error';
import { Field } from '../../core/domains/interface/databoard';

export class HandleSubscriptionUseCase {
    async execute(body: { app_id: string; email: string; subscribe?: boolean; source?: string }): Promise<any> {
        try {
            const { app_id, email, source = 'Whatsapp', subscribe = true } = body;
            if (!app_id) throw new _Error('App id is required', 400);

            const emailRegex = /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/;
            if (!email || !email.match(emailRegex))
                throw new _Error('Email is required', 400);

            // Get app with data board info
            const app = await this._getAppById(app_id);
            if (!app) throw new _Error('App not found', 404);

            const EMAIL_CAMPAIGN_TABLE = 'Email Campaign';
            const emailCampaignBoard = Object.keys(app.data_board).find(
                (boardId) => app.data_board[boardId].board_name === EMAIL_CAMPAIGN_TABLE
            );

            if (!emailCampaignBoard) throw new _Error('Email campaign not found', 404);

            const boardDetails = app.data_board[emailCampaignBoard];
            const emailField = boardDetails.fields.find((field: Field) => field.name === 'Email');
            if (!emailField) throw new _Error('Email field not found', 404);

            const subscriptionField = boardDetails.fields.find((field: Field) => field.name === 'Subscription');
            if (!subscriptionField) throw new _Error('Subscription field not found', 404);

            const subscribedDate = boardDetails.fields.find((field: Field) => field.name === 'Subscribed Date');
            if (!subscribedDate) throw new _Error('Subscribed Date field not found', 404);

            const sourceField = boardDetails.fields.find((field: Field) => field.name === 'Source');
            if (!sourceField) throw new _Error('Source field not found', 404);

            const { message, success } = await searchRecords(emailCampaignBoard, {
                limit: 20,
                matchingStrategy: 'all',
                offset: 0,
                filter: `fields.${emailField._id} = '${email}'`,
            });

            if (!success) throw new _Error(message, 500);

            if (message.hits.length === 0) {
                const fields = [
                    { board_field_id: emailField._id as string, value: email },
                    { board_field_id: subscriptionField._id as string, value: subscribe ? 'Subscribed' : 'Unsubscribed' },
                    { board_field_id: subscribedDate._id as string, value: new Date().toISOString() },
                    { board_field_id: sourceField._id as string, value: source || 'Whatsapp' },
                ];
                return await createBoardField(emailCampaignBoard, fields);
            }

            if (message.hits.length !== 0) {
                const record = message.hits[0];
                const fields = [
                    { key: subscriptionField._id as string, value: subscribe ? 'Subscribed' : 'Unsubscribed' },
                ];
                return await updateBoardField(emailCampaignBoard, record._id, fields);
            }

            throw new _Error('Email not found', 404);
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private async _getAppById(id: string): Promise<any> {
        const repository = AppRepositoryFactory.create();
        const app = await repository.findById(id);
        if (!app) throw new _Error('App not found', 400);

        return { ...app, data_board: {}, webhook_id: '' };
    }
}
