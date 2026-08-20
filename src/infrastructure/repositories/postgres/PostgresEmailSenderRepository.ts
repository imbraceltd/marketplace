import { eq, and, isNull, sql } from 'drizzle-orm';
import { IEmailSenderRepository } from '../../../application/interfaces/repositories/IEmailSenderRepository';
import { getPgDb, pgEmailSenders } from '../../database/drizzle';
import { EmailSender } from '../../../domain/entities/EmailSender';

export class PostgresEmailSenderRepository extends IEmailSenderRepository {
    async findAll(): Promise<EmailSender[]> {
        const rows = await getPgDb().select().from(pgEmailSenders).where(isNull(pgEmailSenders.deleted_at));
        return rows.map(row => EmailSender.fromRaw(row));
    }
    async findById(id: string): Promise<EmailSender | null> {
        const rows = await getPgDb().select().from(pgEmailSenders).where(eq(pgEmailSenders.id, id)).limit(1);
        if (rows.length === 0) return null;
        return EmailSender.fromRaw(rows[0]);
    }
    async findByOrganizationId(organizationId: string, options: any = {}): Promise<EmailSender[]> {
        const { search, skip = 0, limit = 0 } = options;
        let whereClause = and(eq(pgEmailSenders.organization_id, organizationId), isNull(pgEmailSenders.deleted_at));

        if (search) {
            whereClause = and(whereClause, sql`${pgEmailSenders.email} ILIKE ${`%${search}%`} OR ${pgEmailSenders.title} ILIKE ${`%${search}%`}`);
        }

        const rows = Number(limit) > 0
            ? await getPgDb().select().from(pgEmailSenders).where(whereClause).offset(Number(skip)).limit(Number(limit))
            : await getPgDb().select().from(pgEmailSenders).where(whereClause).offset(Number(skip));

        return rows.map(row => EmailSender.fromRaw(row));
    }
    async create(data: any): Promise<EmailSender> {
        const entity = EmailSender.create(data);
        await getPgDb().insert(pgEmailSenders).values(entity.toDatabase());
        return entity;
    }
    async update(id: string, data: any): Promise<EmailSender | null> {
        await getPgDb().update(pgEmailSenders).set(data).where(eq(pgEmailSenders.id, id));
        return this.findById(id);
    }
    async delete(id: string): Promise<EmailSender | null> {
        const sender = await this.findById(id);
        if (!sender) return null;
        await getPgDb().delete(pgEmailSenders).where(eq(pgEmailSenders.id, id));
        return sender;
    }
    async countWithoutUserId(organizationId: string): Promise<number> {
        const result = await getPgDb().select({ count: sql<number>`count(*)` })
            .from(pgEmailSenders)
            .where(and(
                eq(pgEmailSenders.organization_id, organizationId),
                isNull(pgEmailSenders.user_id),
                isNull(pgEmailSenders.deleted_at)
            ));
        return Number(result[0]?.count || 0);
    }
    async findByEmailAndOrgId(email: string, organizationId: string): Promise<EmailSender | null> {
        const rows = await getPgDb().select().from(pgEmailSenders)
            .where(and(eq(pgEmailSenders.email, email), eq(pgEmailSenders.organization_id, organizationId), isNull(pgEmailSenders.deleted_at)))
            .limit(1);
        if (rows.length === 0) return null;
        return EmailSender.fromRaw(rows[0]);
    }
    async findByUserIdAndOrgId(userId: string, organizationId: string): Promise<EmailSender | null> {
        const rows = await getPgDb().select().from(pgEmailSenders)
            .where(and(eq(pgEmailSenders.user_id, userId), eq(pgEmailSenders.organization_id, organizationId), isNull(pgEmailSenders.deleted_at)))
            .limit(1);
        if (rows.length === 0) return null;
        return EmailSender.fromRaw(rows[0]);
    }
}
