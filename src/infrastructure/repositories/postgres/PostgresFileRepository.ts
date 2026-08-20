import { eq } from 'drizzle-orm';
import { IFileRepository } from '../../../application/interfaces/repositories/IFileRepository';
import { getPgDb, pgFiles } from '../../database/drizzle';
import { FileEntity } from '../../../domain/entities/File';

export class PostgresFileRepository extends IFileRepository {
    async findAll(): Promise<FileEntity[]> {
        const rows = await getPgDb().select().from(pgFiles);
        return rows.map(row => FileEntity.fromRaw(row));
    }
    async findById(id: string): Promise<FileEntity | null> {
        const rows = await getPgDb().select().from(pgFiles).where(eq(pgFiles.id, id)).limit(1);
        if (rows.length === 0) return null;
        return FileEntity.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string): Promise<FileEntity[]> {
        const rows = await getPgDb().select().from(pgFiles).where(eq(pgFiles.organization_id, organizationId));
        return rows.map(row => FileEntity.fromRaw(row));
    }
    async findByShortPath(shortPath: string): Promise<FileEntity | null> {
        const rows = await getPgDb().select().from(pgFiles).where(eq(pgFiles.short_path, shortPath)).limit(1);
        if (rows.length === 0) return null;
        return FileEntity.fromRaw(rows[0]);
    }
    async create(data: any): Promise<FileEntity> {
        const entity = FileEntity.create(data);
        await getPgDb().insert(pgFiles).values(entity.toDatabase());
        return entity;
    }
    async update(id: string, data: any): Promise<FileEntity | null> {
        await getPgDb().update(pgFiles).set(data).where(eq(pgFiles.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<FileEntity | null> {
        const file = await this.findById(id);
        if (!file) return null;
        await getPgDb().delete(pgFiles).where(eq(pgFiles.id, id));
        return file;
    }
}
