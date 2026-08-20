import { eq, and, inArray, like, sql } from 'drizzle-orm';
import { IAppRepository } from '../../../application/interfaces/repositories/IAppRepository';
import { getMysqlDb, mysqlApps } from '../../database/drizzle';
import { App } from '../../../domain/entities/App';

export class MySQLAppRepository extends IAppRepository {
    async findAll(): Promise<App[]> {
        const rows = await getMysqlDb().select().from(mysqlApps);
        return rows.map(row => App.fromRaw(row));
    }

    async findById(id: string): Promise<App | null> {
        const rows = await getMysqlDb().select().from(mysqlApps).where(eq(mysqlApps.id, id)).limit(1);
        if (rows.length === 0) return null;
        return App.fromRaw(rows[0]);
    }

    async findByOrganizationId(organizationId: string): Promise<App[]> {
        const rows = await getMysqlDb().select().from(mysqlApps).where(eq(mysqlApps.organization_id, organizationId));
        return rows.map(row => App.fromRaw(row));
    }

    async findByWorkflowId(workflowId: string): Promise<App | null> {
        const rows = await getMysqlDb().select().from(mysqlApps).where(eq(mysqlApps.workflow_id, workflowId)).limit(1);
        if (rows.length === 0) return null;
        return App.fromRaw(rows[0]);
    }

    async findByChannelIds(channelIds: string[], organizationId: string): Promise<App[]> {
        const rows = await getMysqlDb().select().from(mysqlApps).where(
            and(
                eq(mysqlApps.organization_id, organizationId),
                sql`JSON_EXTRACT(${mysqlApps.channel}, '$.id') IN (${sql.join(channelIds.map(id => sql`${id}`), sql`, `)})`
            )
        );
        return rows.map(row => App.fromRaw(row));
    }

    async findByIds(ids: string[]): Promise<App[]> {
        if (ids.length === 0) return [];
        const rows = await getMysqlDb().select().from(mysqlApps).where(inArray(mysqlApps.id, ids));
        return rows.map(row => App.fromRaw(row));
    }

    async search(organizationId: string, query?: any): Promise<App[]> {
        const conditions: any[] = [
            eq(mysqlApps.organization_id, organizationId),
            eq(mysqlApps.is_deleted, false),
        ];

        if (query?.title) {
            conditions.push(like(mysqlApps.title, `%${query.title}%`));
        }
        if (query?.app_type) {
            conditions.push(eq(mysqlApps.app_type, query.app_type));
        }
        if (query?.is_active !== undefined) {
            conditions.push(eq(mysqlApps.is_active, query.is_active));
        }
        if (query?.product_id) {
            conditions.push(eq(mysqlApps.product_id, query.product_id));
        }

        const rows = await getMysqlDb().select().from(mysqlApps).where(and(...conditions));
        return rows.map(row => App.fromRaw(row));
    }

    async create(data: any): Promise<App> {
        const entity = App.create(data);
        const dbData = entity.toDatabase();
        await getMysqlDb().insert(mysqlApps).values(dbData as any);
        return entity;
    }

    async update(id: string, data: any): Promise<App | null> {
        await getMysqlDb().update(mysqlApps).set(data).where(eq(mysqlApps.id, id));
        return this.findById(id);
    }

    async delete(id: string): Promise<boolean> {
        await getMysqlDb().delete(mysqlApps).where(eq(mysqlApps.id, id));
        return true;
    }
}
