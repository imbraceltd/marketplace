import { IEmailSenderRepository } from '../../../application/interfaces/repositories/IEmailSenderRepository';
import EmailSenderModel from '../../../db/models/EmailSender.model';
import { EmailSender } from '../../../domain/entities/EmailSender';

export class MongoEmailSenderRepository extends IEmailSenderRepository {
    async findAll(): Promise<EmailSender[]> {
        const docs = await EmailSenderModel.find().lean();
        return docs.map(doc => EmailSender.fromRaw(doc));
    }
    async findById(id: string): Promise<EmailSender | null> {
        const doc = await EmailSenderModel.findById(id).lean();
        if (!doc) return null;
        return EmailSender.fromRaw(doc);
    }
    async findByOrganizationId(organizationId: string, options: any = {}): Promise<EmailSender[]> {
        const { search, skip = 0, limit = 0 } = options;
        const query: any = {
            organization_id: organizationId,
            deleted_at: { $exists: false }
        };
        if (search) {
            query.$text = { $search: search };
        }
        let mongoQuery = EmailSenderModel.find(query).skip(Number(skip));
        if (Number(limit) > 0) mongoQuery = mongoQuery.limit(Number(limit));

        const docs = await mongoQuery.lean();
        return docs.map(doc => EmailSender.fromRaw(doc));
    }
    async create(data: any): Promise<EmailSender> {
        const entity = EmailSender.create(data);
        const doc = new EmailSenderModel(entity.toDatabase());
        await doc.save();
        return EmailSender.fromRaw(doc.toObject());
    }
    async update(id: string, data: any): Promise<EmailSender | null> {
        const doc = await EmailSenderModel.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!doc) return null;
        return EmailSender.fromRaw(doc);
    }
    async delete(id: string): Promise<EmailSender | null> {
        const doc = await EmailSenderModel.findByIdAndDelete(id).lean();
        if (!doc) return null;
        return EmailSender.fromRaw(doc);
    }
    async countWithoutUserId(organizationId: string): Promise<number> {
        return await EmailSenderModel.countDocuments({
            organization_id: organizationId,
            user_id: { $exists: false },
            deleted_at: { $exists: false }
        });
    }
    async findByEmailAndOrgId(email: string, organizationId: string): Promise<EmailSender | null> {
        const doc = await EmailSenderModel.findOne({ email, organization_id: organizationId, deleted_at: { $exists: false } }).lean();
        if (!doc) return null;
        return EmailSender.fromRaw(doc);
    }
    async findByUserIdAndOrgId(userId: string, organizationId: string): Promise<EmailSender | null> {
        const doc = await EmailSenderModel.findOne({ user_id: userId, organization_id: organizationId, deleted_at: { $exists: false } }).lean();
        if (!doc) return null;
        return EmailSender.fromRaw(doc);
    }
}
