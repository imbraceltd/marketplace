import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { MarketplaceTemplateRepositoryFactory } from '../../../infrastructure/repositories/factories/MarketplaceTemplateRepositoryFactory';
import { parseTemplateZip } from '../../../core/services/templates/template_zip.service';
import { uploadTemplateZip } from '../../../core/services/templates/template_zip_storage.service';
import _Error from '../../../utils/error';

const MARKETPLACE_ORG_ID = 'template_org';

// Fields stored in metadata — admin-editable, override use_case in graph at install time.
const METADATA_FIELDS = [
    'title',
    'short_description',
    'description',
    'version',
    'features',
    'tags',
    'thumbnail_url',
    'hover_thumbnail_url',
    'media',
    'video_url',
    'demo_url',
    'demo_image_url',
    'how_it_works',
    'suggestion_prompts',
    'supported_channels',
    'integrations',
    'agent_type',
] as const;

const extractUseCaseMetadata = (graph: unknown): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    const resources = (graph as { resources?: Array<{ type?: string; data?: Record<string, unknown> }> })?.resources;
    if (!Array.isArray(resources)) return out;
    const useCase = resources.find((r) => r?.type === 'use_case');
    if (!useCase?.data) return out;
    for (const key of METADATA_FIELDS) {
        if (useCase.data[key] !== undefined) out[key] = useCase.data[key];
    }
    return out;
};

export class ImportMarketplaceTemplateUseCase {
    private repository = MarketplaceTemplateRepositoryFactory.create();

    constructor() {}

    async execute(
        userContext: { org_id?: string } | undefined,
        fileBuffer: Buffer | undefined,
        body: Record<string, unknown>,
    ) {
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new _Error('File ZIP is required', 400);
        }

        const orgId =
            userContext?.org_id ||
            (typeof body?.organization_id === 'string' ? body.organization_id : undefined) ||
            MARKETPLACE_ORG_ID;

        const { metadata: zipMeta, template } = await parseTemplateZip(fileBuffer);

        const name = zipMeta?.title || template.name;
        const type = zipMeta?.type || template.type;
        const description = zipMeta?.description ?? template.description ?? '';

        if (!name) {
            throw new _Error(
                "Template 'name'/'title' is required (missing in both archive comment and template.json)",
                400,
            );
        }
        if (!type) {
            throw new _Error(
                "Template 'type' is required (missing in both archive comment and template.json)",
                400,
            );
        }

        const id = `mp_${crypto.randomUUID()}`;

        const { s3_key } = await uploadTemplateZip(orgId, id, fileBuffer);

        const active = body?.active === undefined ? true : body.active === true || body.active === 'true';

        const useCaseMeta = extractUseCaseMetadata(template.graph);

        const row = await this.repository.create({
            id,
            name,
            description: description || null,
            type,
            organization_id: orgId,
            public_id: uuid(),
            active,
            metadata: {
                title: name,
                description,
                type,
                version: zipMeta?.version,
                ...useCaseMeta,
                ...(typeof body?.model_id === 'string'
                    ? { model_id: body.model_id }
                    : {}),
                ...(typeof body?.provider_id === 'string'
                    ? { provider_id: body.provider_id }
                    : {}),
                ...(typeof body?.vlm_model === 'string'
                    ? { vlm_model: body.vlm_model }
                    : {}),
                ...(typeof body?.vlm_provider_id === 'string'
                    ? { vlm_provider_id: body.vlm_provider_id }
                    : {}),
            },
            zip_s3_key: s3_key,
            created_at: null,
            updated_at: null,
        });

        return row;
    }
}
