import { eq, and, sql } from 'drizzle-orm';
import { IFormRepository } from '../../../application/interfaces/repositories/IFormRepository';
import { getMysqlDb, mysqlForms } from '../../database/drizzle';
import { Form } from '../../../domain/entities/Form';

export class MySQLFormRepository extends IFormRepository {
    async findAll(): Promise<Form[]> {
        const rows = await getMysqlDb().select().from(mysqlForms).where(and(eq(mysqlForms.hidden, false), eq(mysqlForms.is_system, false)));
        return rows.map(row => Form.fromRaw(row));
    }
    async findById(id: string): Promise<Form | null> {
        const rows = await getMysqlDb().select().from(mysqlForms).where(eq(mysqlForms.id, id)).limit(1);
        if (rows.length === 0) return null;
        return Form.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string): Promise<Form[]> {
        const rows = await getMysqlDb().select().from(mysqlForms).where(and(eq(mysqlForms.organization_id, organizationId), eq(mysqlForms.hidden, false), eq(mysqlForms.is_system, false)));
        return rows.map(row => Form.fromRaw(row));
    }
    async create(data: any): Promise<Form> {
        const entity = Form.create(data);
        await getMysqlDb().insert(mysqlForms).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<Form | null> {
        await getMysqlDb().update(mysqlForms).set(data).where(eq(mysqlForms.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<boolean> {
        // MySQL in Drizzle doesn't support .returning(). 
        // We'll check if the record exists first to determine the boolean.
        const row = await this.findById(id);
        if (!row) return false;
        await getMysqlDb().delete(mysqlForms).where(eq(mysqlForms.id, id));
        return true;
    }
    async search(organizationId: string, options: any): Promise<{ data: Form[], total: number }> {
        const { appId, search, skip = 0, limit = 10 } = options;
        let whereClause: any = eq(mysqlForms.organization_id, organizationId);

        if (appId) {
            whereClause = and(whereClause, eq(mysqlForms.app_id, appId));
        }

        const rows = await getMysqlDb().select().from(mysqlForms)
            .where(whereClause)
            .limit(Number(limit))
            .offset(Number(skip));

        return {
            data: rows.map(row => Form.fromRaw(row)),
            total: rows.length
        };
    }
    async deleteByTeamId(organizationId: string, teamId: string): Promise<string[]> {
        // Placeholder for consistency with interface
        return [];
    }
    async findByTeamId(teamId: string): Promise<Form[]> {
        // MySQL JSON search: matches an object with team_id in the teams array
        const rows = await getMysqlDb().select().from(mysqlForms)
            .where(sql`JSON_CONTAINS(${mysqlForms.teams}, JSON_OBJECT('team_id', ${teamId}))`);
        return rows.map(row => Form.fromRaw(row));
    }
    async findByBoardId(organizationId: string, boardId: string): Promise<Form[]> {
        const rows = await getMysqlDb().select().from(mysqlForms)
            .where(and(
                eq(mysqlForms.organization_id, organizationId),
                eq(mysqlForms.board_id, boardId),
                eq(mysqlForms.hidden, false),
                eq(mysqlForms.is_system, false)
            ));
        return rows.map(row => Form.fromRaw(row));
    }
    async deleteByOrganizationId(organizationId: string): Promise<Form[]> {
        const forms = await this.findByOrganizationId(organizationId);
        if (forms.length > 0) {
            await getMysqlDb().delete(mysqlForms).where(eq(mysqlForms.organization_id, organizationId));
        }
        return forms;
    }
}
