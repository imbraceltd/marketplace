export class ITemplateRepository {
    async findAll(options?: { search?: string, skip?: number, limit?: number, sort?: any, category?: string[] | string }): Promise<any[]> { throw new Error('Method not implemented.'); }
    async countAll(options?: { search?: string, category?: string[] | string }): Promise<number> { throw new Error('Method not implemented.'); }
    async findById(id: string): Promise<any | null> { throw new Error('Method not implemented.'); }
    async findByIdOrOriginalId(id: string): Promise<any | null> { throw new Error('Method not implemented.'); }
    async findByOriginalId(originalId: string): Promise<any[]> { throw new Error('Method not implemented.'); }
    async findByOrganizationId(organizationId: string, options?: { search?: string, skip?: number, limit?: number, sort?: any, category?: string[] | string }): Promise<any[]> { throw new Error('Method not implemented.'); }
    async countByOrganizationId(organizationId: string, options?: { search?: string, category?: string[] | string }): Promise<number> { throw new Error('Method not implemented.'); }
    async create(data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async update(id: string, data: any): Promise<any | null> { throw new Error('Method not implemented.'); }
    async delete(id: string): Promise<any | null> { throw new Error('Method not implemented.'); }
}
