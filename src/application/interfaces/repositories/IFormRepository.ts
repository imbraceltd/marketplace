export class IFormRepository {
    async findAll(): Promise<any[]> { throw new Error('Method not implemented.'); }
    async findById(id: string): Promise<any | null> { throw new Error('Method not implemented.'); }
    async findByOrganizationId(organizationId: string): Promise<any[]> { throw new Error('Method not implemented.'); }
    async create(data: any): Promise<any> { throw new Error('Method not implemented.'); }
    async update(id: string, data: any): Promise<any | null> { throw new Error('Method not implemented.'); }
    async delete(id: string): Promise<boolean> { throw new Error('Method not implemented.'); }
    async search(organizationId: string, options: any): Promise<{ data: any[], total: number }> { throw new Error('Method not implemented.'); }
    async deleteByTeamId(organizationId: string, teamId: string): Promise<string[]> { throw new Error('Method not implemented.'); }
    async findByTeamId(teamId: string): Promise<any[]> { throw new Error('Method not implemented.'); }
    async findByBoardId(organizationId: string, boardId: string): Promise<any[]> { throw new Error('Method not implemented.'); }
    async deleteByOrganizationId(organizationId: string): Promise<any[]> { throw new Error('Method not implemented.'); }
}
