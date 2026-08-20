import crypto from 'crypto';

export class App {
    id: string;
    doc_name?: string;
    public_id?: string;
    icon?: any;
    is_hidden?: boolean;
    channel?: any;
    title?: string;
    description?: string;
    url?: string;
    organization_id: string;
    business_unit_id?: string;
    user_id?: string;
    version?: string;
    workflow_id?: string;
    options?: any;
    credentials?: any;
    default_credentials?: any;
    product_id?: string;
    user_progress?: any;
    app_type?: string;
    is_active?: boolean;
    is_deleted?: boolean;
    categories?: any[];
    channels_or_platforms?: any[];
    banner_image?: string;
    icon_image?: string;
    sub_workflows?: any[];
    root_channel_workflow_id?: string;
    product_type?: string;
    product_code?: string;
    created_from?: string;
    direct_data_board?: any;
    tags?: any[];
    updated_at?: Date;
    created_at?: Date;

    constructor(data: any) {
        this.id = data.id || data._id;
        this.doc_name = data.doc_name;
        this.public_id = data.public_id;
        this.icon = data.icon;
        this.is_hidden = data.is_hidden ?? false;
        this.channel = data.channel;
        this.title = data.title;
        this.description = data.description;
        this.url = data.url;
        this.organization_id = data.organization_id;
        this.business_unit_id = data.business_unit_id;
        this.user_id = data.user_id;
        this.version = data.version;
        this.workflow_id = data.workflow_id;
        this.options = data.options;
        this.credentials = data.credentials;
        this.default_credentials = data.default_credentials;
        this.product_id = data.product_id;
        this.user_progress = data.user_progress;
        this.app_type = data.app_type;
        this.is_active = data.is_active ?? false;
        this.is_deleted = data.is_deleted ?? false;
        this.categories = data.categories;
        this.channels_or_platforms = data.channels_or_platforms;
        this.banner_image = data.banner_image;
        this.icon_image = data.icon_image;
        this.sub_workflows = data.sub_workflows;
        this.root_channel_workflow_id = data.root_channel_workflow_id;
        this.product_type = data.product_type;
        this.product_code = data.product_code;
        this.created_from = data.created_from;
        this.direct_data_board = data.direct_data_board;
        this.tags = data.tags;
        this.updated_at = data.updated_at ? new Date(data.updated_at) : undefined;
        this.created_at = data.created_at ? new Date(data.created_at) : undefined;
    }

    static create(data: any) {
        const id = data.id || data._id || `app_${crypto.randomUUID()}`;
        return new App({
            ...data,
            id,
            doc_name: data.doc_name || 'App',
            public_id: data.public_id || crypto.randomUUID(),
            sub_workflows: data.sub_workflows || [],
            tags: data.tags || [],
            direct_data_board: data.direct_data_board || [],
            is_hidden: data.is_hidden ?? false,
            is_active: data.is_active ?? false,
            is_deleted: data.is_deleted ?? false,
        });
    }

    static fromRaw(raw: any) {
        return new App(raw);
    }

    toDatabase() {
        return {
            id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            icon: this.icon,
            is_hidden: this.is_hidden,
            channel: this.channel,
            title: this.title,
            description: this.description,
            url: this.url,
            organization_id: this.organization_id,
            business_unit_id: this.business_unit_id,
            user_id: this.user_id,
            version: this.version,
            workflow_id: this.workflow_id,
            options: this.options,
            credentials: this.credentials,
            default_credentials: this.default_credentials,
            product_id: this.product_id,
            user_progress: this.user_progress,
            app_type: this.app_type,
            is_active: this.is_active,
            is_deleted: this.is_deleted,
            categories: this.categories,
            channels_or_platforms: this.channels_or_platforms,
            banner_image: this.banner_image,
            icon_image: this.icon_image,
            sub_workflows: this.sub_workflows,
            root_channel_workflow_id: this.root_channel_workflow_id,
            product_type: this.product_type,
            product_code: this.product_code,
            created_from: this.created_from,
            direct_data_board: this.direct_data_board,
            tags: this.tags,
            created_at: this.created_at,
            updated_at: this.updated_at,
        };
    }

    toJSON() {
        return {
            _id: this.id,
            doc_name: this.doc_name,
            public_id: this.public_id,
            icon: this.icon,
            is_hidden: this.is_hidden,
            channel: this.channel,
            title: this.title,
            description: this.description,
            url: this.url,
            organization_id: this.organization_id,
            business_unit_id: this.business_unit_id,
            version: this.version,
            workflow_id: this.workflow_id,
            options: this.options,
            credentials: this.credentials,
            default_credentials: this.default_credentials,
            product_id: this.product_id,
            user_progress: this.user_progress,
            app_type: this.app_type,
            is_active: this.is_active,
            is_deleted: this.is_deleted,
            categories: this.categories,
            channels_or_platforms: this.channels_or_platforms,
            banner_image: this.banner_image,
            icon_image: this.icon_image,
            sub_workflows: this.sub_workflows,
            root_channel_workflow_id: this.root_channel_workflow_id,
            product_type: this.product_type,
            product_code: this.product_code,
            created_from: this.created_from,
            direct_data_board: this.direct_data_board,
            tags: this.tags,
            updated_at: this.updated_at,
            created_at: this.created_at,
        };
    }
}
