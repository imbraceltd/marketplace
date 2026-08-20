import { IFormRepository } from '../../../application/interfaces/repositories/IFormRepository';
import FormModel from '../../../db/models/Form.model';
import { Form } from '../../../domain/entities/Form';

export class MongoFormRepository extends IFormRepository {
    async findAll(): Promise<Form[]> {
        const docs = await FormModel.find().lean();
        return docs.map(doc => Form.fromRaw(doc));
    }
    async findById(id: string): Promise<Form | null> {
        const doc = await FormModel.findById(id).lean();
        if (!doc) return null;
        return Form.fromRaw(doc);
    }
    async findByOrganizationId(organizationId: string): Promise<Form[]> {
        const docs = await FormModel.find({ organization_id: organizationId }).lean();
        return docs.map(doc => Form.fromRaw(doc));
    }
    async create(data: any): Promise<Form> {
        const entity = Form.create(data);
        const doc = new FormModel(entity.toDatabase());
        await doc.save();
        return Form.fromRaw(doc.toObject());
    }
    async update(id: string, data: any): Promise<Form | null> {
        const doc = await FormModel.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!doc) return null;
        return Form.fromRaw(doc);
    }
    async delete(id: string): Promise<boolean> {
        const result = await FormModel.findByIdAndDelete(id);
        return !!result;
    }
    async search(organizationId: string, options: any): Promise<{ data: Form[], total: number }> {
        const { appId, search, skip = 0, limit = 10, teamIds } = options;
        const query: any = { organization_id: organizationId };

        if (appId) query.app_id = appId;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { board_name: { $regex: search, $options: 'i' } }
            ];
        }

        if (teamIds && teamIds.length > 0) {
            query.$or = query.$or || [];
            query.$or.push({ 'teams.team_id': { $in: teamIds } });
        }

        const [docs, total] = await Promise.all([
            FormModel.find(query).skip(Number(skip)).limit(Number(limit)).lean(),
            FormModel.countDocuments(query)
        ]);

        return {
            data: docs.map(doc => Form.fromRaw(doc)),
            total
        };
    }
    async deleteByTeamId(organizationId: string, teamId: string): Promise<string[]> {
        const query = {
            organization_id: organizationId,
            'teams.team_id': teamId
        };
        const formsToDelete = await FormModel.find(query).select('_id').lean();
        const ids = formsToDelete.map(f => f._id.toString());
        await FormModel.deleteMany(query);
        return ids;
    }
    async findByTeamId(teamId: string): Promise<Form[]> {
        const docs = await FormModel.find({
            teams: { $elemMatch: { team_id: teamId } }
        }).lean();
        return docs.map(doc => Form.fromRaw(doc));
    }
    async findByBoardId(organizationId: string, boardId: string): Promise<Form[]> {
        const docs = await FormModel.find({
            organization_id: organizationId,
            board_id: boardId,
            hidden: { $ne: true },
            is_system: { $ne: true }
        }).lean();
        return docs.map(doc => Form.fromRaw(doc));
    }
    async deleteByOrganizationId(organizationId: string): Promise<Form[]> {
        const forms = await this.findByOrganizationId(organizationId);
        if (forms.length > 0) {
            await FormModel.deleteMany({ organization_id: organizationId });
        }
        return forms;
    }
}
