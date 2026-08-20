import { createTemplateV3 } from '../../core/services/templates/create_template.service';
import { TemplateRepositoryFactory } from '../../infrastructure/repositories/factories/TemplateRepositoryFactory';

export class CreateTemplateUseCase {
    private repository = TemplateRepositoryFactory.create();

    constructor() { }

    async execute(userContext: any, data: any) {
        const { name, type, id, description = "", active = false } = data;
        const rawTemplateData = await createTemplateV3(userContext, { name, type, id, description, active });
        const result = await this.repository.create(rawTemplateData);
        return result;
    }
}
