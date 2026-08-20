import { eq, ilike, sql, and, inArray, SQL } from 'drizzle-orm';
import { IUseCaseRepository } from '../../../application/interfaces/repositories/IUseCaseRepository';
import { getPgDb, pgUseCases } from '../../database/drizzle';
import { UseCase } from '../../../domain/entities/UseCase';

export class PostgresUseCaseRepository extends IUseCaseRepository {
    async findAll(options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<UseCase[]> {
        const where: SQL[] = [eq(pgUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(ilike(pgUseCases.title, `%${options.search}%`));
        }

        const query = getPgDb().select().from(pgUseCases).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (pgUseCases as any)[field];
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
        const where: SQL[] = [eq(pgUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(ilike(pgUseCases.title, `%${options.search}%`));
        }

        const result = await getPgDb().select({ count: sql<number>`count(*)` }).from(pgUseCases).where(and(...where));
        return Number(result[0].count);
    }
    async findById(id: string): Promise<UseCase | null> {
        const rows = await getPgDb().select().from(pgUseCases).where(and(eq(pgUseCases.id, id), eq(pgUseCases.is_deleted, false))).limit(1);
        if (rows.length === 0) return null;
        return UseCase.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string, options?: { search?: string, skip?: number, limit?: number, sort?: any }): Promise<UseCase[]> {
        const where: SQL[] = [eq(pgUseCases.organization_id, organizationId), eq(pgUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(ilike(pgUseCases.title, `%${options.search}%`));
        }

        const query = getPgDb().select().from(pgUseCases).where(and(...where)).$dynamic();

        if (options?.sort) {
            const [field, order] = Object.entries(options.sort)[0];
            const column = (pgUseCases as any)[field];
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
        const rows = await getPgDb()
            .select()
            .from(pgUseCases)
            .where(and(
                inArray(pgUseCases.assistant_id, assistantIds),
                eq(pgUseCases.is_deleted, false),
            ));
        return rows.map(row => UseCase.fromRaw(row));
    }
    async countByOrganizationId(organizationId: string, options?: { search?: string }): Promise<number> {
        const where: SQL[] = [eq(pgUseCases.organization_id, organizationId), eq(pgUseCases.is_deleted, false)];
        if (options?.search) {
            where.push(ilike(pgUseCases.title, `%${options.search}%`));
        }

        const result = await getPgDb().select({ count: sql<number>`count(*)` }).from(pgUseCases).where(and(...where));
        return Number(result[0].count);
    }
    async create(data: any): Promise<UseCase> {
        const entity = UseCase.create(data);
        await getPgDb().insert(pgUseCases).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<UseCase | null> {
        await getPgDb().update(pgUseCases).set(data).where(and(eq(pgUseCases.id, id), eq(pgUseCases.is_deleted, false)));
        return this.findById(id);
    }
    async delete(id: string): Promise<UseCase | null> {
        const ucase = await this.findById(id);
        if (!ucase) return null;
        await getPgDb().update(pgUseCases).set({ is_deleted: true }).where(eq(pgUseCases.id, id));
        return this.findById(id);
    }
}
