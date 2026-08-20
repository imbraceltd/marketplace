import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { TemplateRepositoryFactory } from '../../infrastructure/repositories/factories/TemplateRepositoryFactory';
import { parseTemplateZip } from '../../core/services/templates/template_zip.service';
import { uploadTemplateZip } from '../../core/services/templates/template_zip_storage.service';
import _Error from '../../utils/error';

// Catalog templates don't belong to any user's org. Matches the TEMPLATE_ORG_ID
// convention already used in create_template.service.ts.
const MARKETPLACE_ORG_ID = 'template_org';

export class ImportTemplateFromZipUseCase {
    private repository = TemplateRepositoryFactory.create();

    constructor() {}

    async execute(userContext: any, fileBuffer: Buffer | undefined, body: any) {
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new _Error('File ZIP is required', 400);
        }

        // Endpoint doesn't require a token. Prefer org_id from the x-organization-id header
        // (set by parseUserContext), fall back to `template_org` for catalog entries.
        const orgId = userContext?.org_id || body?.organization_id || MARKETPLACE_ORG_ID;

        const { metadata, template } = await parseTemplateZip(fileBuffer);

        const name = metadata?.title || template.name;
        const type = metadata?.type || template.type;
        const description = metadata?.description ?? template.description ?? '';

        if (!name) throw new _Error("Template 'name'/'title' is required (missing in both archive comment and template.json)", 400);
        if (!type) throw new _Error("Template 'type' is required (missing in both archive comment and template.json)", 400);

        const templateId = `template_${crypto.randomUUID()}`;

        const { s3_key } = await uploadTemplateZip(orgId, templateId, fileBuffer);

        const active = body?.active === undefined ? true : body.active === true || body.active === 'true';

        const row = {
            id: templateId,
            name,
            type,
            description,
            graph: template.graph,
            deps: template.deps || {},
            organization_id: orgId,
            active,
            public_id: uuid(),
            zip_s3_key: s3_key,
        };

        const created = await this.repository.create(row);
        return created;
    }
}
