import { eq, like, sql, and, inArray, SQL } from 'drizzle-orm';
import { IUseCaseRepository } from '../../../application/interfaces/repositories/IUseCaseRepository';
import { getMysqlDb, mysqlUseCases } from '../../database/drizzle';
import { UseCase } from '../../../domain/entities/UseCase';

export class MySQLUseCaseRepository extends IUseCaseRepository {
    async findAll(options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<UseCase[]> {
        const where: SQL[] = [eq(mysqlUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(like(mysqlUseCases.title, `%${options.search}%`));
        }

        const query = getMysqlDb().select().from(mysqlUseCases).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (mysqlUseCases as any)[field];
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
        return rows.map(row => UseCase.fromRaw(row));
    }
    async countAll(options?: { search?: string }): Promise<number> {
        const where: SQL[] = [eq(mysqlUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(like(mysqlUseCases.title, `%${options.search}%`));
        }

        const result = await getMysqlDb().select({ count: sql<number>`count(*)` }).from(mysqlUseCases).where(and(...where));
        return Number(result[0].count);
    }
    async findById(id: string): Promise<UseCase | null> {
        const rows = await getMysqlDb().select().from(mysqlUseCases).where(and(eq(mysqlUseCases.id, id), eq(mysqlUseCases.is_deleted, false))).limit(1);
        if (rows.length === 0) return null;
        return UseCase.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string, options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<UseCase[]> {
        const where: SQL[] = [eq(mysqlUseCases.organization_id, organizationId), eq(mysqlUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(like(mysqlUseCases.title, `%${options.search}%`));
        }

        const query = getMysqlDb().select().from(mysqlUseCases).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (mysqlUseCases as any)[field];
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
        return rows.map(row => UseCase.fromRaw(row));
    }
    async findByAssistantIds(assistantIds: string[]): Promise<UseCase[]> {
        if (!assistantIds?.length) return [];
        const rows = await getMysqlDb()
            .select()
            .from(mysqlUseCases)
            .where(and(
                inArray(mysqlUseCases.assistant_id, assistantIds),
                eq(mysqlUseCases.is_deleted, false),
            ));
        return rows.map(row => UseCase.fromRaw(row));
    }
    async countByOrganizationId(organizationId: string, options?: { search?: string }): Promise<number> {
        const where: SQL[] = [eq(mysqlUseCases.organization_id, organizationId), eq(mysqlUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(like(mysqlUseCases.title, `%${options.search}%`));
        }

        const result = await getMysqlDb().select({ count: sql<number>`count(*)` }).from(mysqlUseCases).where(and(...where));
        return Number(result[0].count);
    }
    async create(data: any): Promise<UseCase> {
        const entity = UseCase.create(data);
        await getMysqlDb().insert(mysqlUseCases).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<UseCase | null> {
        await getMysqlDb().update(mysqlUseCases).set(data).where(and(eq(mysqlUseCases.id, id), eq(mysqlUseCases.is_deleted, false)));
        return this.findById(id);
    }
    async delete(id: string): Promise<UseCase | null> {
        const ucase = await this.findById(id);
        if (!ucase) return null;
        await getMysqlDb().update(mysqlUseCases).set({ is_deleted: true }).where(eq(mysqlUseCases.id, id));
        return this.findById(id);
    }
}
