import { IAppRepository } from '../../../application/interfaces/repositories/IAppRepository';
import AppModel from '../../../db/models/App.model';
import { App } from '../../../domain/entities/App';

export class MongoAppRepository extends IAppRepository {
    async findAll(): Promise<App[]> {
        const docs = await AppModel.find().lean();
        return docs.map(doc => App.fromRaw(doc));
    }

    async findById(id: string): Promise<App | null> {
        const doc = await AppModel.findById(id).lean();
        if (!doc) return null;
        return App.fromRaw(doc);
    }

    async findByOrganizationId(organizationId: string): Promise<App[]> {
        const docs = await AppModel.find({ organization_id: organizationId }).lean();
        return docs.map(doc => App.fromRaw(doc));
    }

    async findByWorkflowId(workflowId: string): Promise<App | null> {
        const doc = await AppModel.findOne({ workflow_id: workflowId }).lean();
        if (!doc) return null;
        return App.fromRaw(doc);
    }

    async findByChannelIds(channelIds: string[], organizationId: string): Promise<App[]> {
        const docs = await AppModel.find({
            'channel.id': { $in: channelIds },
            organization_id: organizationId,
        }).lean();
        return docs.map(doc => App.fromRaw(doc));
    }

    async findByIds(ids: string[]): Promise<App[]> {
        if (ids.length === 0) return [];
        const docs = await AppModel.find({ _id: { $in: ids } }).lean();
        return docs.map(doc => App.fromRaw(doc));
    }

    async search(organizationId: string, query?: any): Promise<App[]> {
        const filter: any = { organization_id: organizationId };

        if (query?.title) {
            filter.title = { $regex: query.title, $options: 'i' };
        }
        if (query?.app_type) {
            filter.app_type = query.app_type;
        }
        if (query?.is_active !== undefined) {
            filter.is_active = query.is_active;
        }
        if (query?.product_id) {
            filter.product_id = query.product_id;
        }

        const docs = await AppModel.find(filter).lean();
        return docs.map(doc => App.fromRaw(doc));
    }

    async create(data: any): Promise<App> {
        const entity = App.create(data);
        const doc = new AppModel(entity.toDatabase());
        await doc.save();
        return App.fromRaw(doc.toObject());
    }

    async update(id: string, data: any): Promise<App | null> {
        const doc = await AppModel.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!doc) return null;
        return App.fromRaw(doc);
    }

    async delete(id: string): Promise<boolean> {
        const result = await AppModel.findByIdAndDelete(id);
        return !!result;
    }
}
