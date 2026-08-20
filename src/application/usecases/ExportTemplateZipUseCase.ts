import { TemplateRepositoryFactory } from '../../infrastructure/repositories/factories/TemplateRepositoryFactory';
import { buildTemplateZip } from '../../core/services/templates/template_zip.service';
import {
    uploadTemplateZip,
    getTemplateZipDownloadUrl,
} from '../../core/services/templates/template_zip_storage.service';
import _Error from '../../utils/error';

export class ExportTemplateZipUseCase {
    private repository = TemplateRepositoryFactory.create();

    constructor() {}

    async execute(userContext: any, templateId: string): Promise<{ download_url: string; s3_key: string }> {
        if (!templateId) throw new _Error('Template ID is required', 400);

        const template = await this.repository.findById(templateId);
        if (!template) throw new _Error('Template not found', 404);

        if (template.zip_s3_key) {
            const cachedUrl = await getTemplateZipDownloadUrl(template.zip_s3_key);
            return { download_url: cachedUrl, s3_key: template.zip_s3_key };
        }

        const buffer = await buildTemplateZip({
            name: template.name,
            type: template.type,
            description: template.description,
            graph: template.graph,
            deps: template.deps || {},
        });

        const orgId = userContext?.org_id || template.organization_id;
        const { s3_key } = await uploadTemplateZip(orgId, template.id, buffer);

        await this.repository.update(template.id, { zip_s3_key: s3_key });

        const url = await getTemplateZipDownloadUrl(s3_key);
        return { download_url: url, s3_key };
    }
}
