import { IFileRepository } from '../../../application/interfaces/repositories/IFileRepository';
import FileModel from '../../../db/models/File.model';
import { FileEntity } from '../../../domain/entities/File';

export class MongoFileRepository extends IFileRepository {
    async findAll(): Promise<FileEntity[]> {
        const docs = await FileModel.find().lean();
        return docs.map(doc => FileEntity.fromRaw(doc));
    }
    async findById(id: string): Promise<FileEntity | null> {
        const doc = await FileModel.findById(id).lean();
        if (!doc) return null;
        return FileEntity.fromRaw(doc);
    }
    async findByOrganizationId(organizationId: string): Promise<FileEntity[]> {
        const docs = await FileModel.find({ organization_id: organizationId }).lean();
        return docs.map(doc => FileEntity.fromRaw(doc));
    }
    async findByShortPath(shortPath: string): Promise<FileEntity | null> {
        const doc = await FileModel.findOne({ short_path: shortPath }).lean();
        if (!doc) return null;
        return FileEntity.fromRaw(doc);
    }
    async create(data: any): Promise<FileEntity> {
        const entity = FileEntity.create(data);
        const doc = new FileModel(entity.toDatabase());
        await doc.save();
        return FileEntity.fromRaw(doc.toObject());
    }
    async update(id: string, data: any): Promise<FileEntity | null> {
        const doc = await FileModel.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!doc) return null;
        return FileEntity.fromRaw(doc);
    }
    async delete(id: string): Promise<FileEntity | null> {
        const doc = await FileModel.findByIdAndDelete(id).lean();
        if (!doc) return null;
        return FileEntity.fromRaw(doc);
    }
}
