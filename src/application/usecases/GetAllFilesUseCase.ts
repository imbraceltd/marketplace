import { IFileRepository } from '../interfaces/repositories/IFileRepository';

export class GetAllFilesUseCase {
    constructor(private repository: IFileRepository) { }

    async execute(userContext: any) {
        const organizationId = userContext.org_id;
        if (!organizationId) throw new Error('Organization id is required');

        const files = await this.repository.findByOrganizationId(organizationId);
        return files.map(file => file.toJSON());
    }
}
