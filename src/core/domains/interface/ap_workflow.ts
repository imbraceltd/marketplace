import { ITag } from "./tags";

export interface IAPWorkflowParameters {
    id: string
    name: string
    status: string
    triggerSource: unknown
    boardIds?: string[];
    assistantIds?: {
        assistantId: string;
        workflowId: string;
    }[];
    version?: {
        displayName?: string;
        trigger?: {
            nextAction?: any;
        };
        flowId?: string;
    };
    metadata?:{
        tags? :Array<ITag>;
    }
}