import { MarketplaceTemplateRepositoryFactory } from '../../../infrastructure/repositories/factories/MarketplaceTemplateRepositoryFactory';
import { parseTemplateZip } from '../../../core/services/templates/template_zip.service';
import { readTemplateZipBuffer } from '../../../core/services/templates/template_zip_storage.service';
import { installTemplate } from '../../../core/services/templates/create_template.service';
import { AssistantInstallOverrides } from '../../../core/domains/interface/aiAssistant';
import _Error from '../../../utils/error';

// Fields the admin can edit via metadata — they override use_case data in the graph on install.
const OVERRIDABLE_FIELDS = [
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
];

const mergeMetadataIntoGraph = (
    graph: unknown,
    metadata: Record<string, unknown>,
): unknown => {
    if (!graph || typeof graph !== 'object') return graph;
    const g = graph as { resources?: Array<Record<string, unknown>> };
    if (!Array.isArray(g.resources)) return graph;

    const newResources = g.resources.map((resource) => {
        if (resource?.type !== 'use_case') return resource;
        const data = (resource?.data as Record<string, unknown>) ?? {};
        const overrides: Record<string, unknown> = {};
        for (const key of OVERRIDABLE_FIELDS) {
            if (metadata[key] !== undefined) overrides[key] = metadata[key];
        }
        return {
            ...resource,
            data: { ...data, ...overrides },
        };
    });

    return { ...g, resources: newResources };
};

export class InstallMarketplaceTemplateUseCase {
    private repository = MarketplaceTemplateRepositoryFactory.create();

    constructor() {}

    async execute(
        userContext: { org_id?: string; business_unit_id?: string; user_id?: string; role?: string } | undefined,
        id: string,
        body: Record<string, unknown>,
    ) {
        if (!id) throw new _Error('id is required', 400);
        if (!userContext?.org_id) throw new _Error('Missing organization info', 401);

        const row = await this.repository.findById(id);
        if (!row) throw new _Error('Marketplace template not found', 404);
        if (!row.zip_s3_key) {
            throw new _Error('Marketplace template has no zip; cannot install', 400);
        }

        const buffer = await readTemplateZipBuffer(row.zip_s3_key);
        const { template } = await parseTemplateZip(buffer);

        const mergedGraph = mergeMetadataIntoGraph(template.graph, row.metadata ?? {});

        const isDisabledNewId = body?.is_disabled_id_generated === true || body?.is_disabled_id_generated === 'true';
        const isCloneBoardItems = body?.is_clone_board_items === true || body?.is_clone_board_items === 'true';

        // Precedence: install-body > marketplace metadata > hardcoded default.
        const metaSettings = (row.metadata ?? {}) as Record<string, unknown>;
        const pickStr = (k: string): string | undefined => {
            const fromBody = body?.[k];
            if (typeof fromBody === 'string') return fromBody;
            const fromMeta = metaSettings[k];
            if (typeof fromMeta === 'string') return fromMeta;
            return undefined;
        };
        const overrides: AssistantInstallOverrides = {};
        const m = pickStr('model_id'); if (m) overrides.model_id = m;
        const p = pickStr('provider_id'); if (p) overrides.provider_id = p;
        const vm = pickStr('vlm_model'); if (vm) overrides.vlm_model = vm;
        const vp = pickStr('vlm_provider_id'); if (vp) overrides.vlm_provider_id = vp;

        const result = await installTemplate(
            {
                org_id: userContext.org_id,
                business_unit_id: userContext.business_unit_id ?? '',
                user_id: userContext.user_id,
                role: userContext.role,
            },
            null,
            isDisabledNewId,
            isCloneBoardItems,
            { graph: mergedGraph, deps: template.deps ?? {} },
            overrides,
        );

        return { success: result ? true : false, marketplace_template_id: row.id };
    }
}
