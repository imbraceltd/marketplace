import { eq, ilike, sql, and, SQL } from 'drizzle-orm';
import {
    IMarketplaceTemplateRepository,
    ListOptions,
    MarketplaceTemplateRow,
} from '../../../application/interfaces/repositories/IMarketplaceTemplateRepository';
import { getPgDb, pgMarketplaceTemplates } from '../../database/drizzle';

type Row = typeof pgMarketplaceTemplates.$inferSelect;

const toRow = (raw: Row): MarketplaceTemplateRow => ({
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    type: raw.type,
    organization_id: raw.organization_id,
    public_id: raw.public_id ?? null,
    active: raw.active ?? null,
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    zip_s3_key: raw.zip_s3_key,
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
});

const buildWhere = (options?: ListOptions): SQL[] => {
    const where: SQL[] = [];
    if (options?.organizationId) {
        where.push(eq(pgMarketplaceTemplates.organization_id, options.organizationId));
    }
    if (options?.search) {
        where.push(ilike(pgMarketplaceTemplates.name, `%${options.search}%`));
    }
    if (options?.activeOnly) {
        where.push(eq(pgMarketplaceTemplates.active, true));
    }
    return where;
};

export class PostgresMarketplaceTemplateRepository extends IMarketplaceTemplateRepository {
    async findAll(options?: ListOptions): Promise<MarketplaceTemplateRow[]> {
        const where = buildWhere(options);
        const query = getPgDb()
            .select()
            .from(pgMarketplaceTemplates)
            .where(and(...where))
            .$dynamic();

        query.orderBy(sql`${pgMarketplaceTemplates.created_at} DESC`);

        if (options?.limit !== undefined && options.limit > 0) {
            query.limit(options.limit);
        }
        if (options?.skip !== undefined && options.skip > 0) {
            query.offset(options.skip);
        }

        const rows = await query;
        return rows.map(toRow);
    }

    async countAll(options?: ListOptions): Promise<number> {
        const where = buildWhere(options);
        const result = await getPgDb()
            .select({ count: sql<number>`count(*)` })
            .from(pgMarketplaceTemplates)
            .where(and(...where));
        return Number(result[0].count);
    }

    async findById(id: string): Promise<MarketplaceTemplateRow | null> {
        const rows = await getPgDb()
            .select()
            .from(pgMarketplaceTemplates)
            .where(eq(pgMarketplaceTemplates.id, id))
            .limit(1);
        if (rows.length === 0) return null;
        return toRow(rows[0]);
    }

    async create(data: MarketplaceTemplateRow): Promise<MarketplaceTemplateRow> {
        await getPgDb().insert(pgMarketplaceTemplates).values({
            id: data.id,
            name: data.name,
            description: data.description ?? null,
            type: data.type,
            organization_id: data.organization_id,
            public_id: data.public_id ?? null,
            active: data.active ?? true,
            metadata: data.metadata as any,
            zip_s3_key: data.zip_s3_key,
        });
        const created = await this.findById(data.id);
        if (!created) throw new Error('Failed to load created marketplace template');
        return created;
    }

    async update(
        id: string,
        data: Partial<MarketplaceTemplateRow>,
    ): Promise<MarketplaceTemplateRow | null> {
        const patch: Record<string, unknown> = { updated_at: new Date() };
        if (data.name !== undefined) patch.name = data.name;
        if (data.description !== undefined) patch.description = data.description;
        if (data.type !== undefined) patch.type = data.type;
        if (data.organization_id !== undefined) patch.organization_id = data.organization_id;
        if (data.public_id !== undefined) patch.public_id = data.public_id;
        if (data.active !== undefined) patch.active = data.active;
        if (data.metadata !== undefined) patch.metadata = data.metadata;
        if (data.zip_s3_key !== undefined) patch.zip_s3_key = data.zip_s3_key;

        await getPgDb()
            .update(pgMarketplaceTemplates)
            .set(patch)
            .where(eq(pgMarketplaceTemplates.id, id));
        return this.findById(id);
    }

    async delete(id: string): Promise<MarketplaceTemplateRow | null> {
        const existing = await this.findById(id);
        if (!existing) return null;
        await getPgDb()
            .delete(pgMarketplaceTemplates)
            .where(eq(pgMarketplaceTemplates.id, id));
        return existing;
    }
}
