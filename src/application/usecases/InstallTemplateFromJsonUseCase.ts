import logger from '../../server/logging/logger';
import { installTemplate } from '../../core/services/templates/create_template.service';
import { TemplateRepositoryFactory } from '../../infrastructure/repositories/factories/TemplateRepositoryFactory';
import { parseTemplateZip } from '../../core/services/templates/template_zip.service';
import { readTemplateZipBuffer } from '../../core/services/templates/template_zip_storage.service';
import _Error from '../../utils/error';
import { buildAssistantOverridesFromBody } from './InstallTemplateUseCase';

export class InstallTemplateFromJsonUseCase {
    private repository = TemplateRepositoryFactory.create();

    constructor() { }

    async execute(userContext: any, body: any) {
        const { template, template_id, is_disabled_id_generated = false, is_clone_board_items = false } = body;

        let templateData: { graph: any; deps: any };

        if (template_id) {
            const row = await this.repository.findById(template_id);
            if (!row) {
                throw new _Error('Template not found', 404);
            }

            if (row.zip_s3_key) {
                try {
                    const buffer = await readTemplateZipBuffer(row.zip_s3_key);
                    const { template: parsed } = await parseTemplateZip(buffer);
                    templateData = { graph: parsed.graph, deps: parsed.deps || {} };
                } catch (err: any) {
                    logger.info('install-from-json: S3 zip read failed, falling back to DB row', { err: err?.message });
                    templateData = { graph: row.graph, deps: row.deps || {} };
                }
            } else {
                templateData = { graph: row.graph, deps: row.deps || {} };
            }
        } else if (template && template.graph) {
            templateData = { graph: template.graph, deps: template.deps || {} };
        } else {
            throw new _Error("Invalid request: either 'template_id' or 'template' (with graph) is required.", 400);
        }

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
