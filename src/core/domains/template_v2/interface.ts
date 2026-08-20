export enum ResourceType {
    DATA_BOARD = 'data_board',
    WORKFLOW = 'workflow',
    JOURNEY = 'journey',
    CHANNEL = 'channel',
    AUTOMATION = 'automation',
    AI_ASSISTANT = 'ai_assistant',
    ORGANIZATION = 'organization',
    USE_CASE = 'use_case',
}

export interface IResource {
    id: string; // template id or root resource id or new created resource id
    name: string;
    data: Cloneable;
    type: ResourceType;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Cloneable {
    clone(): this; // return payload that can be used to create a new instance, save to db or call apis
    add(...resources: IResource[]): void; // use to decorate the resource
}


