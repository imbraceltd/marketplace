export class IFileRepository {
    async findAll(): Promise<any[]> { throw new Error('Method not implemented.'); }
    async findById(id: string): Promise<any | null> { throw new Error('Method not implemented.'); }
    async findByOrganizationId(organizationId: string): Promise<any[]> { throw new Error('Method not implemented.'); }
    async findByShortPath(shortPath: string): Promise<any | null> { throw new Error('Method not implemented.'); }
    async create(data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async update(id: string, data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async delete(id: string): Promise<any | null> { throw new Error('Method not implemented.'); }
}
