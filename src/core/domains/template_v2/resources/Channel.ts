import logger from '../../../../server/logging/logger';
import { IDataObject } from '../../interface/types';
import { IResource } from '../interface';

export interface ChannelParameters {
    doc_name: string;
    name: string;
    active: boolean;
    is_deleted?: boolean;
    is_replace?: boolean;
    bot_id: string;
    business_unit_id?: string;
    organization_id: string;
    config: IDataObject;
    public_id: string;
    created_at?: string;
    credential_id: string;
    updated_at?: string;
    workflow_id: string;
    is_init: boolean;
    errorCode?: number;
    errorMessage?: string;
    touchpoints?: IDataObject[];
    id: string;
}

export class Channel {
    doc_name: string;
    name: string;
    active: boolean;
    is_deleted?: boolean;
    is_replace?: boolean;
    bot_id: string;
    business_unit_id?: string;
    organization_id: string;
    config: IDataObject;
    public_id: string;
    created_at?: string;
    credential_id: string;
    updated_at?: string;
    workflow_id: string;
    is_init: boolean;
    errorCode?: number;
    errorMessage?: string;
    touchpoints?: IDataObject[];
    id: string;

    constructor(parameters: ChannelParameters) {
        this.doc_name = parameters.doc_name;
        this.name = parameters.name;
        this.active = parameters.active;
        this.is_deleted = parameters.is_deleted;
        this.is_replace = parameters.is_replace;
        this.bot_id = parameters.bot_id;
        this.business_unit_id = parameters.business_unit_id;
        this.organization_id = parameters.organization_id;
        this.config = parameters.config;
        this.public_id = parameters.public_id;
        this.created_at = parameters.created_at;
        this.credential_id = parameters.credential_id;
        this.updated_at = parameters.updated_at;
        this.workflow_id = parameters.workflow_id;
        this.is_init = parameters.is_init;
        this.errorCode = parameters.errorCode;
        this.errorMessage = parameters.errorMessage;
        this.touchpoints = parameters.touchpoints;
        this.id = parameters.id;
    }

    toChannelParameters(): ChannelParameters {
        return {
            doc_name: this.doc_name,
            name: this.name,
            active: this.active,
            is_deleted: this.is_deleted,
            is_replace: this.is_replace,
            bot_id: this.bot_id,
            business_unit_id: this.business_unit_id,
            organization_id: this.organization_id,
            config: this.config,
            public_id: this.public_id,
            created_at: this.created_at,
            credential_id: this.credential_id,
            updated_at: this.updated_at,
            workflow_id: this.workflow_id,
            is_init: this.is_init,
            errorCode: this.errorCode,
            errorMessage: this.errorMessage,
            id: this.id,
        };
    }

    clone(): this {
        return new Channel(this.toChannelParameters()) as this;
    }

    add(...resources: IResource[]): void {
        logger.info(resources);
        return;
    }
}
