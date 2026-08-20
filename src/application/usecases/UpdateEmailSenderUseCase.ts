import { IEmailSenderRepository } from '../interfaces/repositories/IEmailSenderRepository';
import _Error, { handleServiceError } from '../../utils/error';

export class UpdateEmailSenderUseCase {
    constructor(private repository: IEmailSenderRepository) { }

    async execute(userContext: any, id: string, data: any) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const current = await this.repository.findById(id);
            if (!current || current.organization_id !== organizationId) {
                throw new _Error('Email sender not found', 404);
            }

            const { email, user_id } = data;
            if (email && !this.validateEmail(email)) {
                throw new _Error('Email sender email is invalid', 400);
            }

            if (email && email !== current.email) {
                const existEmail = await this.repository.findByEmailAndOrgId(email, organizationId);
                if (existEmail && existEmail.id !== id) {
                    throw new _Error(`E11000 duplicate key error: { email: "${email}", organization_id: "${organizationId}" }`, 400);
                }
            }

            const updateData = {
                ...data,
                updated_at: new Date(),
            };

            return await this.repository.update(id, updateData);
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private validateEmail(email: string) {
        const re = /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/;
        return re.test(email);
    }
}
