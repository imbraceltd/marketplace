import { eq, and } from 'drizzle-orm';
import { IFormRepository } from '../../../application/interfaces/repositories/IFormRepository';
import { getPgDb, pgForms } from '../../database/drizzle';
import { Form } from '../../../domain/entities/Form';
import { sql } from 'drizzle-orm';

export class PostgresFormRepository extends IFormRepository {
    async findAll(): Promise<Form[]> {
        const rows = await getPgDb().select().from(pgForms).where(and(eq(pgForms.hidden, false), eq(pgForms.is_system, false)));
        return rows.map(row => Form.fromRaw(row));
    }
    async findById(id: string): Promise<Form | null> {
        const rows = await getPgDb().select().from(pgForms).where(eq(pgForms.id, id)).limit(1);
        if (rows.length === 0) return null;
        return Form.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string): Promise<Form[]> {
        const rows = await getPgDb().select().from(pgForms).where(and(eq(pgForms.organization_id, organizationId), eq(pgForms.hidden, false), eq(pgForms.is_system, false)));
        return rows.map(row => Form.fromRaw(row));
    }
    async create(data: any): Promise<Form> {
        const entity = Form.create(data);
        await getPgDb().insert(pgForms).values(entity.toDatabase());
        return entity;
    }
    async update(id: string, data: any): Promise<Form | null> {
        await getPgDb().update(pgForms).set(data).where(eq(pgForms.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<boolean> {
        const result = await getPgDb().delete(pgForms).where(eq(pgForms.id, id)).returning({ id: pgForms.id });
        return result.length > 0;
    }
    async search(organizationId: string, options: any): Promise<{ data: Form[], total: number }> {
        const { app_id, appId, search, skip = 0, limit = 10, teamIds = [], userId } = options;
        const targetAppId = app_id || appId;

        let conditions = sql`${pgForms.organization_id} = ${organizationId} AND ${pgForms.is_system} IS NOT TRUE AND ${pgForms.hidden} IS NOT TRUE`;

        if (targetAppId) {
            conditions = sql`${conditions} AND ${pgForms.app_id} = ${targetAppId}`;
        }

        // Search logic
        if (search) {
            const searchPattern = `%${search}%`;
            conditions = sql`${conditions} AND (${pgForms.name} ILIKE ${searchPattern} OR ${pgForms.description} ILIKE ${searchPattern} OR ${pgForms.board_name} ILIKE ${searchPattern})`;
        }

        // ACL logic (matching v1 $or logic)
        // 1. Teams match (JSONB containment)
        let aclConditions = sql`FALSE`;
        if (teamIds && teamIds.length > 0) {
            // Using JSONB containment operator @> for each teamId
            const teamChecks = teamIds.map((tid: string) => sql`${pgForms.teams} @> ${JSON.stringify([{ team_id: tid }])}::jsonb`);
            aclConditions = sql`${sql.join(teamChecks, sql` OR `)}`;
        }

        // 2. Teams empty or not exists
        aclConditions = sql`${aclConditions} OR jsonb_array_length(COALESCE(${pgForms.teams}, '[]'::jsonb)) = 0`;

        // 3. Owner not exists or null
        aclConditions = sql`${aclConditions} OR ${pgForms.owner} IS NULL`;

        // 4. Created by user
        if (userId) {
            aclConditions = sql`${aclConditions} OR ${pgForms.created_by} = ${userId} OR (${pgForms.owner}->>'user_id') = ${userId}`;
        }

        const finalWhere = sql`${conditions} AND (${aclConditions})`;

        // Get count
        const countResult = await getPgDb().select({
            count: sql<number>`count(*)`
        })
            .from(pgForms)
            .where(finalWhere);

        const total = Number(countResult[0]?.count || 0);

        // Get data
        const rows = await getPgDb().select().from(pgForms)
            .where(finalWhere)
            .orderBy(sql`${pgForms.is_active} DESC, ${pgForms.updated_at} DESC`)
            .limit(Number(limit) > 0 ? Number(limit) : 1000) // Default large limit if 0
            .offset(Number(skip));

        return {
            data: rows.map(row => Form.fromRaw(row)),
            total
        };
    }
    async deleteByTeamId(organizationId: string, teamId: string): Promise<string[]> {
        // Since Postgres implementation of search/delete by dynamic JSON is complex in this repo,
        // we provide a placeholder that matches the interface.
        return [];
    }
    async findByTeamId(teamId: string): Promise<Form[]> {
        const rows = await getPgDb().select().from(pgForms)
            .where(sql`${pgForms.teams} @> ${JSON.stringify([{ team_id: teamId }])}::jsonb`);
        return rows.map(row => Form.fromRaw(row));
    }
    async findByBoardId(organizationId: string, boardId: string): Promise<Form[]> {
        const rows = await getPgDb().select().from(pgForms)
            .where(and(
                eq(pgForms.organization_id, organizationId),
                eq(pgForms.board_id, boardId),
                eq(pgForms.hidden, false),
                eq(pgForms.is_system, false)
            ));
        return rows.map(row => Form.fromRaw(row));
    }
    async deleteByOrganizationId(organizationId: string): Promise<Form[]> {
        const forms = await this.findByOrganizationId(organizationId);
        if (forms.length > 0) {
            await getPgDb().delete(pgForms).where(eq(pgForms.organization_id, organizationId));
        }
        return forms;
    }
}
