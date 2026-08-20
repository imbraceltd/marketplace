export class IAppRepository {
    async findAll(): Promise<any[]> {
        throw new Error('Method not implemented.');
    }

    async findById(id: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async findByOrganizationId(organizationId: string): Promise<any[]> {
        throw new Error('Method not implemented.');
    }

    async findByWorkflowId(workflowId: string): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async findByChannelIds(channelIds: string[], organizationId: string): Promise<any[]> {
        throw new Error('Method not implemented.');
    }

    async findByIds(ids: string[]): Promise<any[]> {
        throw new Error('Method not implemented.');
    }

    async search(organizationId: string, query?: any): Promise<any[]> {
        throw new Error('Method not implemented.');
    }

    async create(data: any): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async update(id: string, data: any): Promise<any> {
        throw new Error('Method not implemented.');
    }

    async delete(id: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
}
