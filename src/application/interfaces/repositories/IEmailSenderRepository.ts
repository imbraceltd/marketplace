export class IEmailSenderRepository {
    async findAll(): Promise<any[]> { throw new Error('Method not implemented.'); }
    async findById(id: string): Promise<any> { throw new Error('Method not implemented.'); }
    async findByOrganizationId(organizationId: string, options?: any): Promise<any[]> { throw new Error('Method not implemented.'); }
    async create(data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async update(id: string, data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async delete(id: string): Promise<any> { throw new Error('Method not implemented.'); }
    async countWithoutUserId(organizationId: string): Promise<number> { throw new Error('Method not implemented.'); }
    async findByEmailAndOrgId(email: string, organizationId: string): Promise<any> { throw new Error('Method not implemented.'); }
    async findByUserIdAndOrgId(userId: string, organizationId: string): Promise<any> { throw new Error('Method not implemented.'); }
}
