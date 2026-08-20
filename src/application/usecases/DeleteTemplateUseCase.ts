import { TemplateRepositoryFactory } from '../../infrastructure/repositories/factories/TemplateRepositoryFactory';
import _Error from '../../utils/error';

export class DeleteTemplateUseCase {
    private repository = TemplateRepositoryFactory.create();

    constructor() { }

    async execute(id: string) {
        if (!id) {
            throw new _Error('template id is required', 400);
        }

        const template = await this.repository.findById(id);
        if (!template) {
            throw new _Error('Template not found', 404);
        }

        const result = await this.repository.delete(id);
        return result;
    }
}
