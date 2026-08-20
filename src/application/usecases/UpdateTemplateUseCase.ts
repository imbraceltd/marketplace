import { updateTemplateV3 } from '../../core/services/templates/create_template.service';
import { TemplateRepositoryFactory } from '../../infrastructure/repositories/factories/TemplateRepositoryFactory';

export class UpdateTemplateUseCase {
    private repository = TemplateRepositoryFactory.create();

    constructor() { }

    async execute(id: string, data: any, userContext: any) {
        const { name, type, description, active, updateGraph = false } = data;

        return await updateTemplateV3(userContext, {
            id,
            name,
            type,
            description,
            active,
            updateGraph,
        });
    }
}
