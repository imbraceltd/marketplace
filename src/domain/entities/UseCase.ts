import crypto from 'crypto';

export class UseCase {
    id: string;
    doc_name?: string;
    public_id?: string;
    title: string;
    version?: number;
    organization_id: string;
    short_description?: string;
    description?: string;
    type?: string;
    channel_id?: string;
    features?: any[];
    thumbnail_url?: string;
    hover_thumbnail_url?: string;
    media?: string[];
    tags?: any[];
    video_url?: string;
    demo_url?: string;
    demo_image_url?: string;
    how_it_works?: any[];
    suggestion_prompts?: any[];
    supported_channels?: any[];
    integrations?: any[];
    template_id?: string;
    assistant_id?: string;
    user_id?: string;
    is_deleted?: boolean;
    agent_type?: string;
    // True when this use case is a team's auto-provisioned default agent (created on
    // team creation).
    is_team_default_agent?: boolean;
    updated_at?: Date;
    created_at?: Date;

    constructor(data: any) {
        this.id = data.id || data._id;
        this.doc_name = data.doc_name;
        this.public_id = data.public_id;
        this.title = data.title;
        this.version = data.version ?? 1;
        this.organization_id = data.organization_id;
        this.short_description = data.short_description;
        this.description = data.description;
        this.type = data.type ?? 'default';
        this.channel_id = data.channel_id;
        this.features = data.features;
        this.thumbnail_url = data.thumbnail_url;
        this.hover_thumbnail_url = data.hover_thumbnail_url;
        this.media = data.media;
        this.tags = data.tags;
        this.video_url = data.video_url;
        this.demo_url = data.demo_url;
        this.demo_image_url = data.demo_image_url;
        this.how_it_works = data.how_it_works;
        this.suggestion_prompts = data.suggestion_prompts;
        this.supported_channels = data.supported_channels;
        this.integrations = data.integrations;
        this.template_id = data.template_id;
        this.assistant_id = data.assistant_id;
        this.user_id = data.user_id;
        this.is_deleted = data.is_deleted ?? false;
        this.agent_type = data.agent_type;
        this.is_team_default_agent = data.is_team_default_agent ?? false;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : undefined;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }

    static create(data: any) {
        const now = new Date();
        const id = data.id || data._id || `uc_${crypto.randomUUID()}`;
        return new UseCase({
            ...data,
            id,
            doc_name: data.doc_name ?? 'UseCase',
            public_id: data.public_id || crypto.randomUUID(),
            version: data.version ?? 1,
            type: data.type ?? 'default',
            features: data.features ?? [],
            media: data.media ?? [],
            tags: data.tags ?? [],
            suggestion_prompts: data.suggestion_prompts ?? [],
            how_it_works: data.how_it_works ?? [],
            supported_channels: data.supported_channels ?? [],
            integrations: data.integrations ?? [],
            is_deleted: data.is_deleted ?? false,
            created_at: data.created_at ?? now,
            updated_at: data.updated_at ?? now,
        });
    }

    static fromRaw(raw: any) {
        return new UseCase(raw);
    }

    toDatabase() {
        return {
            id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            title: this.title,
            version: this.version,
            organization_id: this.organization_id,
            short_description: this.short_description,
            description: this.description,
            type: this.type,
            channel_id: this.channel_id,
            features: this.features,
            thumbnail_url: this.thumbnail_url,
            hover_thumbnail_url: this.hover_thumbnail_url,
            media: this.media,
            tags: this.tags,
            video_url: this.video_url,
            demo_url: this.demo_url,
            demo_image_url: this.demo_image_url,
            how_it_works: this.how_it_works,
            suggestion_prompts: this.suggestion_prompts,
            supported_channels: this.supported_channels,
            integrations: this.integrations,
            template_id: this.template_id,
            assistant_id: this.assistant_id,
            user_id: this.user_id,
            is_deleted: this.is_deleted,
            agent_type: this.agent_type,
            is_team_default_agent: this.is_team_default_agent ?? false,
            created_at: this.created_at,
            updated_at: this.updated_at,
        };
    }

    toJSON() {
        return {
            _id: this.id,
            doc_name: this.doc_name ?? 'UseCase',
            public_id: this.public_id,
            title: this.title,
            version: this.version ?? 1,
            organization_id: this.organization_id,
            short_description: this.short_description,
            description: this.description,
            type: this.type ?? 'default',
            channel_id: this.channel_id,
            features: this.features ?? [],
            thumbnail_url: this.thumbnail_url,
            hover_thumbnail_url: this.hover_thumbnail_url,
            media: this.media ?? [],
            tags: this.tags ?? [],
            video_url: this.video_url,
            demo_url: this.demo_url,
            demo_image_url: this.demo_image_url,
            how_it_works: this.how_it_works ?? [],
            suggestion_prompts: this.suggestion_prompts ?? [],
            supported_channels: this.supported_channels ?? [],
            integrations: this.integrations ?? [],
            template_id: this.template_id,
            assistant_id: this.assistant_id,
            user_id: this.user_id,
            is_deleted: this.is_deleted ?? false,
            agent_type: this.agent_type,
            is_team_default_agent: this.is_team_default_agent ?? false,
            updated_at: this.updated_at,
            created_at: this.created_at,
            createdAt: this.created_at,
            updatedAt: this.updated_at,
            id: this.id,
        };
    }
}
