import { eq, and, sql, asc, desc } from 'drizzle-orm';
import { IEmailTemplateRepository } from '../../../application/interfaces/repositories/IEmailTemplateRepository';
import { getPgDb, pgEmailTemplates } from '../../database/drizzle';
import { EmailTemplate } from '../../../domain/entities/EmailTemplate';

export class PostgresEmailTemplateRepository extends IEmailTemplateRepository {
    async findAll(): Promise<EmailTemplate[]> {
        const rows = await getPgDb().select().from(pgEmailTemplates);
        return rows.map(row => EmailTemplate.fromRaw(row));
    }
    async findById(id: string): Promise<EmailTemplate | null> {
        const rows = await getPgDb().select().from(pgEmailTemplates).where(eq(pgEmailTemplates.id, id)).limit(1);
        if (rows.length === 0) return null;
        return EmailTemplate.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string, options: any = {}): Promise<EmailTemplate[]> {
        const { search, skip = 0, limit = 0, sort, query, field, q } = options;
        const whereClauses = [eq(pgEmailTemplates.organization_id, organizationId)];

        if (search) {
            whereClauses.push(sql`(${pgEmailTemplates.name} ILIKE ${`%${search}%`} OR ${pgEmailTemplates.subject} ILIKE ${`%${search}%`})`);
        }

        if (field && q) {
            if (field === 'name' || field === 'title') {
                whereClauses.push(sql`${pgEmailTemplates.name} ILIKE ${`%${q}%`}`);
            } else if (field === 'subject') {
                whereClauses.push(sql`${pgEmailTemplates.subject} ILIKE ${`%${q}%`}`);
            }
        }

        if (query) {
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null && (pgEmailTemplates as any)[key]) {
                    whereClauses.push(eq((pgEmailTemplates as any)[key], value));
                }
            });
        }

        let queryBuilder = getPgDb().select().from(pgEmailTemplates).where(and(...whereClauses)).$dynamic();

        if (sort) {
            Object.entries(sort).forEach(([key, order]) => {
                const column = (pgEmailTemplates as any)[key];
                if (column) {
                    queryBuilder = queryBuilder.orderBy(order === -1 ? desc(column) : asc(column));
                }
            });
        } else {
            queryBuilder = queryBuilder.orderBy(desc(pgEmailTemplates.updated_at));
        }

        if (Number(limit) > 0) {
            queryBuilder = queryBuilder.limit(Number(limit));
        }
        if (Number(skip) > 0) {
            queryBuilder = queryBuilder.offset(Number(skip));
        }

        const rows = await queryBuilder;
        return rows.map(row => EmailTemplate.fromRaw(row));
    }
    async create(data: any): Promise<EmailTemplate> {
        const entity = EmailTemplate.create(data);
        await getPgDb().insert(pgEmailTemplates).values(entity.toDatabase());
        return entity;
    }
    async update(id: string, data: any): Promise<EmailTemplate | null> {
        await getPgDb().update(pgEmailTemplates).set(data).where(eq(pgEmailTemplates.id, id));
        return this.findById(id);
    }
    async updateMany(query: any, data: any): Promise<any> {
        const whereClauses = Object.entries(query).map(([key, value]) => eq((pgEmailTemplates as any)[key], value));
        return getPgDb().update(pgEmailTemplates).set(data).where(and(...whereClauses));
    }
    async delete(id: string): Promise<EmailTemplate | null> {
        const template = await this.findById(id);
        if (!template) return null;
        await getPgDb().delete(pgEmailTemplates).where(eq(pgEmailTemplates.id, id));
        return template;
    }
    async countByOrganizationId(organizationId: string, options: any = {}): Promise<number> {
        const { search, query, field, q } = options;
        const whereClauses = [eq(pgEmailTemplates.organization_id, organizationId)];

        if (search) {
            whereClauses.push(sql`(${pgEmailTemplates.name} ILIKE ${`%${search}%`} OR ${pgEmailTemplates.subject} ILIKE ${`%${search}%`})`);
        }

        if (field && q) {
            if (field === 'name' || field === 'title') {
                whereClauses.push(sql`${pgEmailTemplates.name} ILIKE ${`%${q}%`}`);
            } else if (field === 'subject') {
                whereClauses.push(sql`${pgEmailTemplates.subject} ILIKE ${`%${q}%`}`);
            }
        }

        if (query) {
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null && (pgEmailTemplates as any)[key]) {
                    whereClauses.push(eq((pgEmailTemplates as any)[key], value));
                }
            });
        }

        const result = await getPgDb().select({ count: sql<number>`count(*)` })
            .from(pgEmailTemplates)
            .where(and(...whereClauses));
        return Number(result[0]?.count || 0);
    }
}
