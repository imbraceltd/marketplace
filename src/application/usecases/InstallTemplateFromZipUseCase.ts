import { installTemplate } from '../../core/services/templates/create_template.service';
import { parseTemplateZip } from '../../core/services/templates/template_zip.service';
import _Error from '../../utils/error';
import { buildAssistantOverridesFromBody } from './InstallTemplateUseCase';

export class InstallTemplateFromZipUseCase {
    constructor() {}

    async execute(userContext: any, fileBuffer: Buffer | undefined, body: any) {
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new _Error('File ZIP is required', 400);
        }

        const { template, metadata } = await parseTemplateZip(fileBuffer);

        const { is_disabled_id_generated = false, is_clone_board_items = false } = body || {};

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

        return { success: !!result, metadata };
    }
}
