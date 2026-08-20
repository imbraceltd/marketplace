import { IEmailTemplateRepository } from '../../../application/interfaces/repositories/IEmailTemplateRepository';
import EmailTemplateModel from '../../../db/models/EmailTemplate.model';
import { EmailTemplate } from '../../../domain/entities/EmailTemplate';

export class MongoEmailTemplateRepository extends IEmailTemplateRepository {
    async findAll(): Promise<EmailTemplate[]> {
        const docs = await EmailTemplateModel.find().lean();
        return docs.map(doc => EmailTemplate.fromRaw(doc));
    }
    async findById(id: string): Promise<EmailTemplate | null> {
        const doc = await EmailTemplateModel.findById(id).lean();
        if (!doc) return null;
        return EmailTemplate.fromRaw(doc);
    }
    async findByOrganizationId(organizationId: string, options: any = {}): Promise<EmailTemplate[]> {
        const { query = {}, skip = 0, limit = 0, sort = { updated_at: -1 } } = options;
        const mongoQuery: any = { ...query, organization_id: organizationId };

        let cursor = EmailTemplateModel.find(mongoQuery).skip(Number(skip));
        if (Number(limit) > 0) cursor = cursor.limit(Number(limit));
        if (sort) cursor = cursor.sort(sort);

        const docs = await cursor.lean();
        return docs.map(doc => EmailTemplate.fromRaw(doc));
    }
    async create(data: any): Promise<EmailTemplate> {
        const entity = EmailTemplate.create(data);
        const doc = new EmailTemplateModel(entity.toDatabase());
        await doc.save();
        return EmailTemplate.fromRaw(doc.toObject());
    }
    async update(id: string, data: any): Promise<EmailTemplate | null> {
        const doc = await EmailTemplateModel.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!doc) return null;
        return EmailTemplate.fromRaw(doc);
    }
    async delete(id: string): Promise<EmailTemplate | null> {
        const doc = await EmailTemplateModel.findByIdAndDelete(id).lean();
        if (!doc) return null;
        return EmailTemplate.fromRaw(doc);
    }
    async countByOrganizationId(organizationId: string, query: any = {}): Promise<number> {
        return await EmailTemplateModel.countDocuments({ ...query, organization_id: organizationId });
    }
}
