import { IUseCaseRepository } from '../../../application/interfaces/repositories/IUseCaseRepository';
import UseCaseModel from '../../../db/models/UseCase.model';
import { UseCase } from '../../../domain/entities/UseCase';

export class MongoUseCaseRepository extends IUseCaseRepository {
    async findAll(options?: { search?: string, skip?: number, limit?: number, sort?: any, category?: string[] | string }): Promise<UseCase[]> {
        const query: any = { is_deleted: false };
        if (options?.search) {
            query.title = { $regex: new RegExp(options.search, 'i') };
        }
        if (options?.category) {
            const categories = Array.isArray(options.category) ? options.category : [options.category];
            if (categories.length > 0) {
                query.categories = { $in: categories };
            }
        }

        const mQuery = UseCaseModel.find(query);

        if (options?.sort) mQuery.sort(options.sort);
        if (options?.skip !== undefined) mQuery.skip(options.skip);
        if (options?.limit !== undefined && options?.limit > 0) mQuery.limit(options.limit);

        const docs = await mQuery.lean();
        return docs.map(doc => UseCase.fromRaw(doc));
    }
    async countAll(options?: { search?: string, category?: string[] | string }): Promise<number> {
        const query: any = { is_deleted: false };
        if (options?.search) {
            query.title = { $regex: new RegExp(options.search, 'i') };
        }
        if (options?.category) {
            const categories = Array.isArray(options.category) ? options.category : [options.category];
            if (categories.length > 0) {
                query.categories = { $in: categories };
            }
        }
        return UseCaseModel.countDocuments(query);
    }
    async findById(id: string): Promise<UseCase | null> {
        const doc = await UseCaseModel.findOne({ _id: id, is_deleted: false }).lean();
        if (!doc) return null;
        return UseCase.fromRaw(doc);
    }
    async findByOrganizationId(organizationId: string, options?: { search?: string, skip?: number, limit?: number, sort?: any, category?: string[] | string }): Promise<UseCase[]> {
        const query: any = { organization_id: organizationId, is_deleted: false };
        if (options?.search) {
            query.title = { $regex: new RegExp(options.search, 'i') };
        }
        if (options?.category) {
            const categories = Array.isArray(options.category) ? options.category : [options.category];
            if (categories.length > 0) {
                query.categories = { $in: categories };
            }
        }

        const mQuery = UseCaseModel.find(query);

        if (options?.sort) mQuery.sort(options.sort);
        if (options?.skip !== undefined) mQuery.skip(options.skip);
        if (options?.limit !== undefined && options?.limit > 0) mQuery.limit(options.limit);

        const docs = await mQuery.lean();
        return docs.map(doc => UseCase.fromRaw(doc));
    }
    async findByAssistantIds(assistantIds: string[]): Promise<UseCase[]> {
        if (!assistantIds?.length) return [];
        const docs = await UseCaseModel.find({
            assistant_id: { $in: assistantIds },
            is_deleted: false,
        }).lean();
        return docs.map(doc => UseCase.fromRaw(doc));
    }
    async countByOrganizationId(organizationId: string, options?: { search?: string, category?: string[] | string }): Promise<number> {
        const query: any = { organization_id: organizationId, is_deleted: false };
        if (options?.search) {
            query.title = { $regex: new RegExp(options.search, 'i') };
        }
        if (options?.category) {
            const categories = Array.isArray(options.category) ? options.category : [options.category];
            if (categories.length > 0) {
                query.categories = { $in: categories };
            }
        }
        return UseCaseModel.countDocuments(query);
    }
    async create(data: any): Promise<UseCase> {
        const entity = UseCase.create(data);
        const doc = new UseCaseModel(entity.toDatabase());
        await doc.save();
        return UseCase.fromRaw(doc.toObject());
    }
    async update(id: string, data: any): Promise<UseCase | null> {
        const doc = await UseCaseModel.findOneAndUpdate({ _id: id, is_deleted: false }, data, { new: true }).lean();
        if (!doc) return null;
        return UseCase.fromRaw(doc);
    }
    async delete(id: string): Promise<UseCase | null> {
        const result = await UseCaseModel.findOneAndUpdate({ _id: id, is_deleted: false }, { is_deleted: true }, { new: true }).lean();
        if (!result) return null;
        return UseCase.fromRaw(result);
    }
}
