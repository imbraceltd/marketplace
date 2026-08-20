import { eq, and, sql, asc, desc } from 'drizzle-orm';
import { IEmailTemplateRepository } from '../../../application/interfaces/repositories/IEmailTemplateRepository';
import { getMysqlDb, mysqlEmailTemplates } from '../../database/drizzle';
import { EmailTemplate } from '../../../domain/entities/EmailTemplate';

export class MySQLEmailTemplateRepository extends IEmailTemplateRepository {
    async findAll(): Promise<EmailTemplate[]> {
        const rows = await getMysqlDb().select().from(mysqlEmailTemplates);
        return rows.map(row => EmailTemplate.fromRaw(row));
    }
    async findById(id: string): Promise<EmailTemplate | null> {
        const rows = await getMysqlDb().select().from(mysqlEmailTemplates).where(eq(mysqlEmailTemplates.id, id)).limit(1);
        if (rows.length === 0) return null;
        return EmailTemplate.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string, options: any = {}): Promise<EmailTemplate[]> {
        const { search, skip = 0, limit = 0, sort } = options;
        const whereClauses = [eq(mysqlEmailTemplates.organization_id, organizationId)];

        if (search) {
            whereClauses.push(sql`${mysqlEmailTemplates.name} LIKE ${`%${search}%`} OR ${mysqlEmailTemplates.subject} LIKE ${`%${search}%`}`);
        }

        let queryBuilder = getMysqlDb().select().from(mysqlEmailTemplates).where(and(...whereClauses)).$dynamic();

        if (sort) {
            const [key, order] = Object.entries(sort)[0] as [string, any];
            const column = (mysqlEmailTemplates as any)[key];
            if (column) {
                queryBuilder = queryBuilder.orderBy(order === -1 ? desc(column) : asc(column));
            }
        } else {
            queryBuilder = queryBuilder.orderBy(desc(mysqlEmailTemplates.updated_at));
        }

        queryBuilder = queryBuilder.offset(Number(skip));
        if (Number(limit) > 0) {
            queryBuilder = queryBuilder.limit(Number(limit));
        }

        const rows = await queryBuilder;
        return rows.map(row => EmailTemplate.fromRaw(row));
    }
    async create(data: any): Promise<EmailTemplate> {
        const entity = EmailTemplate.create(data);
        await getMysqlDb().insert(mysqlEmailTemplates).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<EmailTemplate | null> {
        await getMysqlDb().update(mysqlEmailTemplates).set(data).where(eq(mysqlEmailTemplates.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<EmailTemplate | null> {
        const template = await this.findById(id);
        if (!template) return null;
        await getMysqlDb().delete(mysqlEmailTemplates).where(eq(mysqlEmailTemplates.id, id));
        return template;
    }
    async countByOrganizationId(organizationId: string, query: any = {}): Promise<number> {
        const whereClauses = [eq(mysqlEmailTemplates.organization_id, organizationId)];
        if (query.search) {
            whereClauses.push(sql`${mysqlEmailTemplates.name} LIKE ${`%${query.search}%`}`);
        }
        const result = await getMysqlDb().select({ count: sql<number>`count(*)` })
            .from(mysqlEmailTemplates)
            .where(and(...whereClauses));
        return Number(result[0]?.count || 0);
    }
}
