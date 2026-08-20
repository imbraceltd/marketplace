import logger from '../../../../server/logging/logger';
import { IResource } from '../interface';


export interface IUseCaseParameters {
    id: string;
    title: string;
    short_description: string;
    description: string;
    features: string[];
    thumbnail_url: string;
    hover_thumbnail_url: string;
    media: string[];
    tags: string[];
    video_url: string;
    demo_url: string;
    demo_image_url: string;
    how_it_works?: {
        title: string;
        details: string[];
    }[];
    suggestion_prompts: string[];
    supported_channels: {
        title: string;
        icon: string;
    }[];
    integrations: {
        title: string;
        icon: string;
    }[];
    template_id: string;
    channel_id: string;
    assistant_id: string;
    user_id?: string;
    organization_id: string;
    version?: number;
    agent_type?: string;
}

export class UseCase {
    id: string;
    title: string;
    short_description: string;
    description: string;
    features: string[];
    version?: number;
    thumbnail_url: string;
    hover_thumbnail_url: string;
    media: string[];
    tags: string[];
    video_url: string;
    demo_url: string;
    demo_image_url: string;
    organization_id: string;
    how_it_works?: {
        title: string;
        details: string[];
    }[];
    suggestion_prompts: string[];
    supported_channels: {
        title: string;
        icon: string;
    }[];
    integrations: {
        title: string;
        icon: string;
    }[];
    template_id: string;
    assistant_id: string;
    user_id?: string;
    channel_id: string;
    agent_type?: string;

    constructor(parameters: IUseCaseParameters) {
        this.id = parameters.id;
        this.title = parameters.title;
        this.short_description = parameters.short_description;
        this.description = parameters.description;
        this.features = parameters.features;
        this.thumbnail_url = parameters.thumbnail_url;
        this.hover_thumbnail_url = parameters.hover_thumbnail_url;
        this.media = parameters.media;
        this.tags = parameters.tags;
        this.video_url = parameters.video_url;
        this.demo_url = parameters.demo_url;
        this.demo_image_url = parameters.demo_image_url;
        this.how_it_works = parameters.how_it_works;
        this.suggestion_prompts = parameters.suggestion_prompts;
        this.supported_channels = parameters.supported_channels;
        this.integrations = parameters.integrations;
        this.template_id = parameters.template_id;
        this.assistant_id = parameters.assistant_id;
        this.user_id = parameters.user_id;
        this.channel_id = parameters?.channel_id;
        this.organization_id = parameters.organization_id;
        this.version = parameters.version;
        this.agent_type = parameters.agent_type;
    }

    toDataBoardParameters(): IUseCaseParameters {
        return {
            id: this.id,
            title: this.title,
            short_description: this.short_description,
            description: this.description,
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
            channel_id: this?.channel_id,
            user_id: this.user_id,
            organization_id: this.organization_id,
            version: this.version,
            agent_type: this.agent_type,
        };

    }

    clone(): this {
        return new UseCase(this.toDataBoardParameters()) as this;
    }

    add(...resources: IResource[]): void {
        logger.info(resources);
        return;
    }
}
