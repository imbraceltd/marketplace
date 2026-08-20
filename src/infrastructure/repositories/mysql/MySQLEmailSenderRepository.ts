import { eq, and, sql, isNull } from 'drizzle-orm';
import { IEmailSenderRepository } from '../../../application/interfaces/repositories/IEmailSenderRepository';
import { getMysqlDb, mysqlEmailSenders } from '../../database/drizzle';
import { EmailSender } from '../../../domain/entities/EmailSender';

export class MySQLEmailSenderRepository extends IEmailSenderRepository {
    async findAll(): Promise<EmailSender[]> {
        const rows = await getMysqlDb().select().from(mysqlEmailSenders).where(isNull(mysqlEmailSenders.deleted_at));
        return rows.map(row => EmailSender.fromRaw(row));
    }
    async findById(id: string): Promise<EmailSender | null> {
        const rows = await getMysqlDb().select().from(mysqlEmailSenders).where(eq(mysqlEmailSenders.id, id)).limit(1);
        if (rows.length === 0) return null;
        return EmailSender.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string, options: any = {}): Promise<EmailSender[]> {
        const { search, skip = 0, limit = 0 } = options;
        let whereClause = and(eq(mysqlEmailSenders.organization_id, organizationId), isNull(mysqlEmailSenders.deleted_at));

        if (search) {
            whereClause = and(whereClause, sql`${mysqlEmailSenders.email} LIKE ${`%${search}%`} OR ${mysqlEmailSenders.title} LIKE ${`%${search}%`}`);
        }

        const rows = Number(limit) > 0
            ? await getMysqlDb().select().from(mysqlEmailSenders).where(whereClause).offset(Number(skip)).limit(Number(limit))
            : await getMysqlDb().select().from(mysqlEmailSenders).where(whereClause).offset(Number(skip));

        return rows.map(row => EmailSender.fromRaw(row));
    }
    async create(data: any): Promise<EmailSender> {
        const entity = EmailSender.create(data);
        await getMysqlDb().insert(mysqlEmailSenders).values(entity.toDatabase() as any);
        return entity;
    }
    async update(id: string, data: any): Promise<EmailSender | null> {
        await getMysqlDb().update(mysqlEmailSenders).set(data).where(eq(mysqlEmailSenders.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<EmailSender | null> {
        const sender = await this.findById(id);
        if (!sender) return null;
        await getMysqlDb().delete(mysqlEmailSenders).where(eq(mysqlEmailSenders.id, id));
        return sender;
    }
    async countWithoutUserId(organizationId: string): Promise<number> {
        const result = await getMysqlDb().select({ count: sql<number>`count(*)` })
            .from(mysqlEmailSenders)
            .where(and(
                eq(mysqlEmailSenders.organization_id, organizationId),
                isNull(mysqlEmailSenders.user_id),
                isNull(mysqlEmailSenders.deleted_at)
            ));
        return Number(result[0]?.count || 0);
    }
    async findByEmailAndOrgId(email: string, organizationId: string): Promise<EmailSender | null> {
        const rows = await getMysqlDb().select().from(mysqlEmailSenders)
            .where(and(eq(mysqlEmailSenders.email, email), eq(mysqlEmailSenders.organization_id, organizationId), isNull(mysqlEmailSenders.deleted_at)))
            .limit(1);
        if (rows.length === 0) return null;
        return EmailSender.fromRaw(rows[0]);
    }
    async findByUserIdAndOrgId(userId: string, organizationId: string): Promise<EmailSender | null> {
        const rows = await getMysqlDb().select().from(mysqlEmailSenders)
            .where(and(eq(mysqlEmailSenders.user_id, userId), eq(mysqlEmailSenders.organization_id, organizationId), isNull(mysqlEmailSenders.deleted_at)))
            .limit(1);
        if (rows.length === 0) return null;
        return EmailSender.fromRaw(rows[0]);
    }
}
