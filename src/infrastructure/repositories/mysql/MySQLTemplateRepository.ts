import { eq, like, sql, and, SQL } from 'drizzle-orm';
import { ITemplateRepository } from '../../../application/interfaces/repositories/ITemplateRepository';
import { getMysqlDb, mysqlTemplates } from '../../database/drizzle';
import { Template } from '../../../domain/entities/Template';

export class MySQLTemplateRepository extends ITemplateRepository {
    async findAll(options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<Template[]> {
        const where: SQL[] = [];
        if (options?.search) {
            where.push(like(mysqlTemplates.name, `%${options.search}%`));
        }

        const query = getMysqlDb().select().from(mysqlTemplates).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (mysqlTemplates as any)[field];
            if (column) {
                query.orderBy(order === 'desc' ? sql`${column} DESC` : sql`${column} ASC`);
            }
        }

        if (options?.limit !== undefined && options?.limit > 0) {
            query.limit(options.limit);
        }
        if (options?.skip !== undefined) {
            query.offset(options.skip);
        }

        const rows = await query;
        return rows.map(row => Template.fromRaw(row));
    }
    async countAll(options?: { search?: string }): Promise<number> {
        const where: SQL[] = [];
        if (options?.search) {
            where.push(like(mysqlTemplates.name, `%${options.search}%`));
        }
        const result = await getMysqlDb().select({ count: sql<number>`count(*)` }).from(mysqlTemplates).where(and(...where));
        return Number(result[0].count);
    }
    async findById(id: string): Promise<Template | null> {
        const rows = await getMysqlDb().select().from(mysqlTemplates).where(eq(mysqlTemplates.id, id)).limit(1);
        if (rows.length === 0) return null;
        return Template.fromRaw(rows[0]);
    }
    async findByIdOrOriginalId(id: string): Promise<Template | null> {
        const rows = await getMysqlDb().select().from(mysqlTemplates).where(sql`${mysqlTemplates.id} = ${id} OR ${mysqlTemplates.original_id} = ${id}`).limit(1);
        if (rows.length === 0) return null;
        return Template.fromRaw(rows[0]);
    }
    async findByOriginalId(originalId: string): Promise<Template[]> {
        const rows = await getMysqlDb().select().from(mysqlTemplates).where(eq(mysqlTemplates.original_id, originalId));
        return rows.map(row => Template.fromRaw(row));
    }
    async findByOrganizationId(organizationId: string, options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<Template[]> {
        const where: SQL[] = [eq(mysqlTemplates.organization_id, organizationId)];
        if (options?.search) {
            where.push(like(mysqlTemplates.name, `%${options.search}%`));
        }

        const query = getMysqlDb().select().from(mysqlTemplates).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (mysqlTemplates as any)[field];
            if (column) {
                query.orderBy(order === 'desc' ? sql`${column} DESC` : sql`${column} ASC`);
            }
        }

        if (options?.limit !== undefined && options?.limit > 0) {
            query.limit(options.limit);
        }
        if (options?.skip !== undefined) {
            query.offset(options.skip);
        }

        const rows = await query;
        return rows.map(row => Template.fromRaw(row));
    }
    async countByOrganizationId(organizationId: string, options?: { search?: string }): Promise<number> {
        const where: SQL[] = [eq(mysqlTemplates.organization_id, organizationId)];
        if (options?.search) {
            where.push(like(mysqlTemplates.name, `%${options.search}%`));
        }
        const result = await getMysqlDb().select({ count: sql<number>`count(*)` }).from(mysqlTemplates).where(and(...where));
        return Number(result[0].count);
    }
    async create(data: any): Promise<Template> {
        const entity = Template.create(data);
        await getMysqlDb().insert(mysqlTemplates).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<Template | null> {
        await getMysqlDb().update(mysqlTemplates).set(data).where(eq(mysqlTemplates.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<Template | null> {
        const template = await this.findById(id);
        if (!template) return null;
        await getMysqlDb().delete(mysqlTemplates).where(eq(mysqlTemplates.id, id));
        return template;
    }
}
