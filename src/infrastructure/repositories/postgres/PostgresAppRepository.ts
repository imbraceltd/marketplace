import { eq, and, inArray, ilike, or, sql } from 'drizzle-orm';
import { IAppRepository } from '../../../application/interfaces/repositories/IAppRepository';
import { getPgDb, pgApps } from '../../database/drizzle';
import { App } from '../../../domain/entities/App';

export class PostgresAppRepository extends IAppRepository {
    async findAll(): Promise<App[]> {
        const rows = await getPgDb().select().from(pgApps).where(eq(pgApps.is_deleted, false));
        return rows.map(row => App.fromRaw(row));
    }

    async findById(id: string): Promise<App | null> {
        const rows = await getPgDb().select().from(pgApps).where(eq(pgApps.id, id)).limit(1);
        if (rows.length === 0) return null;
        return App.fromRaw(rows[0]);
    }

    async findByOrganizationId(organizationId: string): Promise<App[]> {
        const rows = await getPgDb().select().from(pgApps).where(and(eq(pgApps.organization_id, organizationId), eq(pgApps.is_deleted, false)));
        return rows.map(row => App.fromRaw(row));
    }

    async findByWorkflowId(workflowId: string): Promise<App | null> {
        const rows = await getPgDb().select().from(pgApps).where(eq(pgApps.workflow_id, workflowId)).limit(1);
        if (rows.length === 0) return null;
        return App.fromRaw(rows[0]);
    }

    async findByChannelIds(channelIds: string[], organizationId: string): Promise<App[]> {
        if (channelIds.length === 0) return [];
        const rows = await getPgDb().select().from(pgApps).where(
            and(
                eq(pgApps.organization_id, organizationId),
                sql`${pgApps.channel}->>'id' = ANY(ARRAY[${sql.join(channelIds.map(id => sql`${id}`), sql`, `)}])`
            )
        );
        return rows.map(row => App.fromRaw(row));
    }

    async findByIds(ids: string[]): Promise<App[]> {
        if (ids.length === 0) return [];
        const rows = await getPgDb().select().from(pgApps).where(inArray(pgApps.id, ids));
        return rows.map(row => App.fromRaw(row));
    }

    async search(organizationId: string, query?: any): Promise<App[]> {
        const conditions: any[] = [
            eq(pgApps.organization_id, organizationId),
            eq(pgApps.is_deleted, false),
        ];

        if (query?.title) {
            conditions.push(ilike(pgApps.title, `%${query.title}%`));
        }
        if (query?.app_type) {
            conditions.push(eq(pgApps.app_type, query.app_type));
        }
        if (query?.is_active !== undefined) {
            conditions.push(eq(pgApps.is_active, query.is_active));
        }
        if (query?.product_id) {
            conditions.push(eq(pgApps.product_id, query.product_id));
        }

        const rows = await getPgDb().select().from(pgApps).where(and(...conditions));
        return rows.map(row => App.fromRaw(row));
    }

    async create(data: any): Promise<App> {
        const entity = App.create(data);
        const dbData = entity.toDatabase();
        await getPgDb().insert(pgApps).values(dbData);
        return entity;
    }

    async update(id: string, data: any): Promise<App | null> {
        await getPgDb().update(pgApps).set(data).where(eq(pgApps.id, id));
        return this.findById(id);
    }

    async delete(id: string): Promise<boolean> {
        const result = await getPgDb().delete(pgApps).where(eq(pgApps.id, id));
        return true;
    }
}
