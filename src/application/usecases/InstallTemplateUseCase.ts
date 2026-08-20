import { AssistantInstallOverrides } from '../../core/domains/interface/aiAssistant';
import { installTemplate } from '../../core/services/templates/create_template.service';
import { TemplateRepositoryFactory } from '../../infrastructure/repositories/factories/TemplateRepositoryFactory';
import _Error from '../../utils/error';

export const buildAssistantOverridesFromBody = (
    body: any,
): AssistantInstallOverrides => {
    const overrides: AssistantInstallOverrides = {};
    if (typeof body?.model_id === 'string') overrides.model_id = body.model_id;
    if (typeof body?.provider_id === 'string')
        overrides.provider_id = body.provider_id;
    if (typeof body?.vlm_model === 'string')
        overrides.vlm_model = body.vlm_model;
    if (typeof body?.vlm_provider_id === 'string')
        overrides.vlm_provider_id = body.vlm_provider_id;
    return overrides;
};

export class InstallTemplateUseCase {
    private repository = TemplateRepositoryFactory.create();

    constructor() { }

    async execute(userContext: any, id: string, body: any) {
        const { is_disabled_id_generated = false, is_clone_board_items = false } = body;

        // Look up template from SQL repository (PostgreSQL/MySQL) via Drizzle ORM.
        // This keeps v3 fully independent from MongoDB.
        const template = await this.repository.findById(id);
        if (!template) {
            throw new _Error('Template not found', 404);
        }

        // Pass template data directly to installTemplate service so it skips
        // the internal MongoDB lookup (Template.findOne) and uses the provided data.
        const templateData = {
            graph: template.graph,
            deps: template.deps || {},
        };

        const overrides = buildAssistantOverridesFromBody(body);

        const result = await installTemplate(
            userContext,
            null,
            is_disabled_id_generated,
            is_clone_board_items,
            templateData,
            overrides,
        );
        return { success: result ? true : false };
    }
}
