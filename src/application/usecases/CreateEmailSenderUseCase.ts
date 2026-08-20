import { IEmailSenderRepository } from '../interfaces/repositories/IEmailSenderRepository';
import _Error, { handleServiceError } from '../../utils/error';

export class CreateEmailSenderUseCase {
    constructor(private repository: IEmailSenderRepository) { }

    async execute(userContext: any, data: any) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const { email, user_id } = data;
            if (!email) throw new _Error('Email sender email is required', 400);
            if (!this.validateEmail(email)) throw new _Error('Email sender email is invalid', 400);
            if (!user_id) throw new _Error('User id is required', 400);

            const existEmail = await this.repository.findByEmailAndOrgId(email, organizationId);
            if (existEmail) {
                throw new _Error(`E11000 duplicate key error: { email: "${email}", organization_id: "${organizationId}" }`, 400);
            }

            const senderData = {
                ...data,
                organization_id: organizationId,
            };

            return await this.repository.create(senderData);
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private validateEmail(email: string) {
        const re = /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/;
        return re.test(email);
    }
}
