import { eq } from 'drizzle-orm';
import { IFileRepository } from '../../../application/interfaces/repositories/IFileRepository';
import { getMysqlDb, mysqlFiles } from '../../database/drizzle';
import { FileEntity } from '../../../domain/entities/File';

export class MySQLFileRepository extends IFileRepository {
    async findAll(): Promise<FileEntity[]> {
        const rows = await getMysqlDb().select().from(mysqlFiles);
        return rows.map(row => FileEntity.fromRaw(row));
    }
    async findById(id: string): Promise<FileEntity | null> {
        const rows = await getMysqlDb().select().from(mysqlFiles).where(eq(mysqlFiles.id, id)).limit(1);
        if (rows.length === 0) return null;
        return FileEntity.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string): Promise<FileEntity[]> {
        const rows = await getMysqlDb().select().from(mysqlFiles).where(eq(mysqlFiles.organization_id, organizationId));
        return rows.map(row => FileEntity.fromRaw(row));
    }
    async findByShortPath(shortPath: string): Promise<FileEntity | null> {
        const rows = await getMysqlDb().select().from(mysqlFiles).where(eq(mysqlFiles.short_path, shortPath)).limit(1);
        if (rows.length === 0) return null;
        return FileEntity.fromRaw(rows[0]);
    }
    async create(data: any): Promise<FileEntity> {
        const entity = FileEntity.create(data);
        await getMysqlDb().insert(mysqlFiles).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<FileEntity | null> {
        await getMysqlDb().update(mysqlFiles).set(data).where(eq(mysqlFiles.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<FileEntity | null> {
        const file = await this.findById(id);
        if (!file) return null;
        await getMysqlDb().delete(mysqlFiles).where(eq(mysqlFiles.id, id));
        return file;
    }
}
