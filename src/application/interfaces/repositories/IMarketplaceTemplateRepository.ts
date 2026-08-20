export interface MarketplaceTemplateRow {
    id: string;
    name: string;
    description: string | null;
    type: string;
    organization_id: string;
    public_id: string | null;
    active: boolean | null;
    metadata: Record<string, unknown>;
    zip_s3_key: string;
    created_at: Date | null;
    updated_at: Date | null;
}

export interface ListOptions {
    search?: string;
    skip?: number;
    limit?: number;
    activeOnly?: boolean;
    organizationId?: string;
}

export class IMarketplaceTemplateRepository {
    async findAll(_options?: ListOptions): Promise<MarketplaceTemplateRow[]> {
        throw new Error('Method not implemented.');
    }
    async countAll(_options?: ListOptions): Promise<number> {
        throw new Error('Method not implemented.');
    }
    async findById(_id: string): Promise<MarketplaceTemplateRow | null> {
        throw new Error('Method not implemented.');
    }
    async create(_data: MarketplaceTemplateRow): Promise<MarketplaceTemplateRow> {
        throw new Error('Method not implemented.');
    }
    async update(
        _id: string,
        _data: Partial<MarketplaceTemplateRow>,
    ): Promise<MarketplaceTemplateRow | null> {
        throw new Error('Method not implemented.');
    }
    async delete(_id: string): Promise<MarketplaceTemplateRow | null> {
        throw new Error('Method not implemented.');
    }
}
