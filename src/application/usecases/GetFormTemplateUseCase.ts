import { templateForm } from '../../core/repositories/form.repository';

export class GetFormTemplateUseCase {
    async execute() {
        return templateForm();
    }
}
