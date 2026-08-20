import { ITemplateRepository } from '../../../application/interfaces/repositories/ITemplateRepository';
import TemplateModel from '../../../db/models/Template';
import { Template } from '../../../domain/entities/Template';

export class MongoTemplateRepository extends ITemplateRepository {
    async findAll(options?: { search?: string, skip?: number, limit?: number, sort?: any, category?: string[] | string }): Promise<Template[]> {
        const query: any = {};
        if (options?.search) {
            query.title = { $regex: options.search, $options: 'i' };
        }
        if (options?.category) {
            query.categories = Array.isArray(options.category) ? { $in: options.category } : options.category;
        }
        let mongoQuery = TemplateModel.find(query);
        if (options?.sort) {
            mongoQuery = mongoQuery.sort(options.sort);
        }
        if (options?.skip !== undefined) {
            mongoQuery = mongoQuery.skip(options.skip);
        }
        if (options?.limit !== undefined) {
            mongoQuery = mongoQuery.limit(options.limit);
        }
        const docs = await mongoQuery.lean();
        return docs.map(doc => Template.fromRaw(doc));
    }
    async countAll(options?: { search?: string, category?: string[] | string }): Promise<number> {
        const query: any = {};
        if (options?.search) {
            query.title = { $regex: options.search, $options: 'i' };
        }
        if (options?.category) {
            query.categories = Array.isArray(options.category) ? { $in: options.category } : options.category;
        }
        return await TemplateModel.countDocuments(query);
    }
    async findById(id: string): Promise<Template | null> {
        const doc = await TemplateModel.findById(id).lean();
        if (!doc) return null;
        return Template.fromRaw(doc);
    }
    async findByIdOrOriginalId(id: string): Promise<Template | null> {
        const doc = await TemplateModel.findOne({
            $or: [{ _id: id }, { id: id }, { original_id: id }]
        }).lean();
        if (!doc) return null;
        return Template.fromRaw(doc);
    }
    async findByOriginalId(originalId: string): Promise<Template[]> {
        const docs = await TemplateModel.find({ original_id: originalId }).lean();
        return docs.map(doc => Template.fromRaw(doc));
    }
    async findByOrganizationId(organizationId: string, options?: { search?: string, skip?: number, limit?: number, sort?: any, category?: string[] | string }): Promise<Template[]> {
        const query: any = { organization_id: organizationId };
        if (options?.search) {
            query.title = { $regex: options.search, $options: 'i' };
        }
        if (options?.category) {
            query.categories = Array.isArray(options.category) ? { $in: options.category } : options.category;
        }
        let mongoQuery = TemplateModel.find(query);
        if (options?.sort) {
            mongoQuery = mongoQuery.sort(options.sort);
        }
        if (options?.skip !== undefined) {
            mongoQuery = mongoQuery.skip(options.skip);
        }
        if (options?.limit !== undefined) {
            mongoQuery = mongoQuery.limit(options.limit);
        }
        const docs = await mongoQuery.lean();
        return docs.map(doc => Template.fromRaw(doc));
    }
    async countByOrganizationId(organizationId: string, options?: { search?: string, category?: string[] | string }): Promise<number> {
        const query: any = { organization_id: organizationId };
        if (options?.search) {
            query.title = { $regex: options.search, $options: 'i' };
        }
        if (options?.category) {
            query.categories = Array.isArray(options.category) ? { $in: options.category } : options.category;
        }
        return await TemplateModel.countDocuments(query);
    }
    async create(data: any): Promise<Template> {
        const entity = Template.create(data);
        const doc = new TemplateModel(entity.toDatabase());
        await doc.save();
        return Template.fromRaw(doc.toObject());
    }
    async update(id: string, data: any): Promise<Template | null> {
        const doc = await TemplateModel.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!doc) return null;
        return Template.fromRaw(doc);
    }
    async delete(id: string): Promise<Template | null> {
        const doc = await TemplateModel.findByIdAndDelete(id).lean();
        if (!doc) return null;
        return Template.fromRaw(doc);
    }
}
