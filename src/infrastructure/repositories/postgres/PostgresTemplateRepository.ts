import { eq, ilike, sql, and, SQL } from 'drizzle-orm';
import { ITemplateRepository } from '../../../application/interfaces/repositories/ITemplateRepository';
import { getPgDb, pgTemplates } from '../../database/drizzle';
import { Template } from '../../../domain/entities/Template';

export class PostgresTemplateRepository extends ITemplateRepository {
    async findAll(options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<Template[]> {
        const where: SQL[] = [];
        if (options?.search) {
            where.push(ilike(pgTemplates.name, `%${options.search}%`));
        }

        const query = getPgDb().select().from(pgTemplates).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (pgTemplates as any)[field];
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
            where.push(ilike(pgTemplates.name, `%${options.search}%`));
        }

        const result = await getPgDb().select({ count: sql<number>`count(*)` }).from(pgTemplates).where(and(...where));
        return Number(result[0].count);
    }
    async findById(id: string): Promise<Template | null> {
        const rows = await getPgDb().select().from(pgTemplates).where(eq(pgTemplates.id, id)).limit(1);
        if (rows.length === 0) return null;
        return Template.fromRaw(rows[0]);
    }
    async findByIdOrOriginalId(id: string): Promise<Template | null> {
        const rows = await getPgDb().select().from(pgTemplates).where(sql`${pgTemplates.id} = ${id} OR ${pgTemplates.original_id} = ${id}`).limit(1);
        if (rows.length === 0) return null;
        return Template.fromRaw(rows[0]);
    }
    async findByOriginalId(originalId: string): Promise<Template[]> {
        const rows = await getPgDb().select().from(pgTemplates).where(eq(pgTemplates.original_id, originalId));
        return rows.map(row => Template.fromRaw(row));
    }
    async findByOrganizationId(organizationId: string, options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<Template[]> {
        const where: SQL[] = [eq(pgTemplates.organization_id, organizationId)];
        if (options?.search) {
            where.push(ilike(pgTemplates.name, `%${options.search}%`));
        }

        const query = getPgDb().select().from(pgTemplates).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (pgTemplates as any)[field];
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
        const where: SQL[] = [eq(pgTemplates.organization_id, organizationId)];
        if (options?.search) {
            where.push(ilike(pgTemplates.name, `%${options.search}%`));
        }

        const result = await getPgDb().select({ count: sql<number>`count(*)` }).from(pgTemplates).where(and(...where));
        return Number(result[0].count);
    }
    async create(data: any): Promise<Template> {
        const entity = Template.create(data);
        await getPgDb().insert(pgTemplates).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<Template | null> {
        await getPgDb().update(pgTemplates).set(data).where(eq(pgTemplates.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<Template | null> {
        const template = await this.findById(id);
        if (!template) return null;
        await getPgDb().delete(pgTemplates).where(eq(pgTemplates.id, id));
        return template;
    }
}
