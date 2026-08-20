export class IEmailTemplateRepository {
    async findAll(): Promise<any[]> { throw new Error('Method not implemented.'); }
    async findById(id: string): Promise<any | null> { throw new Error('Method not implemented.'); }
    async findByOrganizationId(organizationId: string, options?: any): Promise<any[]> { throw new Error('Method not implemented.'); }
    async create(data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async update(id: string, data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async updateMany(query: any, data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async delete(id: string): Promise<any> { throw new Error('Method not implemented.'); }
    async countByOrganizationId(organizationId: string, query?: any): Promise<number> { throw new Error('Method not implemented.'); }
}
