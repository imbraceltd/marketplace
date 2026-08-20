import logger from '../../server/logging/logger';
import config from '../../config';
import axios from 'axios';
import { handleServiceError } from '../../utils/error';
import { IAPWorkflowParameters } from '../domains/interface/ap_workflow';

// Folders (Workflow)
export type IAPFolder = {
    id: string;
    displayName: string;
    projectId: string;
    displayOrder?: number;
    numberOfFlows?: string;
    created?: string;
    updated?: string;
};

export type IAPFoldersResponse = {
    next: string | null;
    previous: string | null;
    data: IAPFolder[];
};

export async function getFolders(orgId: string): Promise<IAPFolder[]> {
    try {
        const url = `${config.ap_workflow.host}/api/v1/folders`;
        const { data } = await axios.get<IAPFoldersResponse>(url, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'x-organization-id': orgId,
            },
            params: {
                limit: 1000000,
            },
        });

        return data?.data ?? [];
    } catch (e) {
        logger.error('Error fetching folders:', e);
        throw handleServiceError(e);
    }
}

export async function duplicateAPWorkflow(orgId: string, inputData: unknown, newWfName: string): Promise<IAPWorkflowParameters> {
    try {
        const { folderId, version, metadata } = inputData as { displayName: string, folderId: string, version: any, metadata: any };
        const { trigger } = version;

        const tagNames: string[] = Array.isArray(metadata?.tags)
            ? metadata.tags
                .map((t: any) => (typeof t?.name === 'string' ? t.name.toLowerCase() : ''))
                .filter(Boolean)
            : [];

        let folderName = 'Others';
        if (tagNames.includes('board')) {
            folderName = 'Board Automation';
        } else if (tagNames.includes('agent')) {
            folderName = 'AI Agent Capabilities';
        }

        const basicWfData = {
            displayName: newWfName,
            folderId: folderId,
            metadata: metadata || {},
            folderName: folderName,
        }
        const url = `${config.ap_workflow.host}/v1/flows`;
        const createdResp = await axios.post(url, basicWfData, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });

        const createdWorkflow = createdResp.data as IAPWorkflowParameters;

        const { id: createdWorkflowId } = createdWorkflow;

        const updatedWfData = {
            "type": "IMPORT_FLOW",
            "request": {
                "displayName": newWfName,
                "trigger": trigger,
                "schemaVersion": "7"
            }
        }



        await axios.post(`${config.ap_workflow.host}/v1/flows/${createdWorkflowId}`, updatedWfData, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });

        const { data } = await axios.post(`${config.ap_workflow.host}/v1/flows/${createdWorkflowId}`, {
            "type": "LOCK_AND_PUBLISH",
            "request": {
                "status": "ENABLED"
            }
        }, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });
        const updatedWorkflowdata = data as IAPWorkflowParameters;
        updatedWorkflowdata.name = updatedWorkflowdata?.version?.displayName || "";
        return updatedWorkflowdata;
    } catch (e) {
        logger.error('Error duplicating AP Workflow:', e);
        throw handleServiceError(e);
    }
}

export async function updateAPWorkflowTrigger(orgId: string, flowId: string, input: unknown): Promise<void> {
    try {
        const url = `${config.ap_workflow.host}/v1/flows/${flowId}`;
        await axios.post(url, {
            type: 'IMPORT_FLOW',
            request: {
                trigger: input,
            },
        }, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });
    } catch (e) {
        logger.error('Error updating AP Workflow trigger:', e);
        throw handleServiceError(e);
    }
}

export async function publishAPWorkflow(orgId: string, workflowId: string, name: string): Promise<void> {
    try {
        await axios.post(`${config.ap_workflow.host}/v1/flows/${workflowId}`, {
            "type": "CHANGE_NAME",
            "request": {
                "displayName": name
            }
        }, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });




        const url = `${config.ap_workflow.host}/v1/flows/${workflowId}`;
        const { data } = await axios.post(url, {
            "type": "LOCK_AND_PUBLISH",
            "request": {
                "status": "ENABLED"
            }
        }, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });

        logger.info('Published AP Workflow:', data);
    } catch (e) {
        logger.error('Error publishing AP Workflow:', e);
        throw handleServiceError(e);
    }
}

export async function getAPWorkflowResources(
    orgId: string,
    assistantWorkflows: {
        assistant_id: string;
        workflow_id: string;
    }[]
): Promise<IAPWorkflowParameters[]> {
    try {
        const url = `${config.ap_workflow.host}/v1/flows`;
        const params: { status: string, limit: number } = {
            status: 'ENABLED',
            limit: -1,
        };
        const { data } = await axios.get(url, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
            params,
        });

        const workflowData: IAPWorkflowParameters[] = data.data;

        const updatedWorkflowData = workflowData?.map(workflow => {
            return { ...workflow, name: workflow?.version?.displayName || "" };
        });
        const updatedWorkflows = await Promise.all(
            updatedWorkflowData.map(workflow => extracMeta(workflow, assistantWorkflows))
        );
        
        return updatedWorkflows;
    } catch (e: any) {
        // Graceful degradation: if the Workflow service isn't
        // reachable (not configured / not running locally — e.g. no http://
        // scheme, ECONNREFUSED, DNS/timeout), treat it as "no workflows"
        // instead of failing the whole template build. Use-cases without a
        // workflow can still be templated. Genuine errors still surface.
        const code = e?.code ?? e?.cause?.code;
        const msg = String(e?.message ?? '');
        const unreachable =
            code === 'ECONNREFUSED' ||
            code === 'ENOTFOUND' ||
            code === 'ETIMEDOUT' ||
            code === 'ERR_INVALID_PROTOCOL' ||
            msg.includes('Unsupported protocol') ||
            msg.includes('ECONNREFUSED');
        if (unreachable) {
            logger.warn('AP workflow service unavailable; continuing with no workflows:', msg);
            return [];
        }
        logger.error('Error fetching AP Workflows:', e);
        throw handleServiceError(e);
    }
}

export async function getAPWorkflow(orgId: string, workflowId: string): Promise<IAPWorkflowParameters | null> {
    // Guard against empty/whitespace workflowId: hitting `/v1/flows/` (no id)
    // returns 409 from workflow (list endpoint with conflicting auth shape)
    // and the body shape diverges from the single-flow response, causing
    // `data.version.displayName` reads to crash with
    // "Cannot read properties of undefined (reading 'type')". Templates with
    // no workflow attached pass workflow_id="" — treat that as "no workflow".
    if (!workflowId || !workflowId.trim()) {
        return null;
    }
    try {
        const url = `${config.ap_workflow.host}/v1/flows/${workflowId}`;
        const { data } = await axios.get(url, {
            headers: {
                'content-type': 'application/json',
                'x-organization-id': orgId,
            },
        });
        const workflowData: IAPWorkflowParameters = data;

        const updatedWorkflowData = { ...workflowData, name: workflowData?.version?.displayName || "" };

        return updatedWorkflowData;
    } catch (e) {
        logger.error('Error fetching AP Workflow:', e);
        throw handleServiceError(e);
    }
}

const extracMeta = async (workflow: IAPWorkflowParameters, assistantWorkflows: {
    assistant_id: string;
    workflow_id: string;
}[]): Promise<IAPWorkflowParameters> => {

    if (!workflow?.version?.trigger?.nextAction) {
        return {
            ...workflow,
            boardIds: [],
            assistantIds: [],
        };
    }

    // Recursive function to traverse nextAction structure and collect boardIds
    const collectBoardIds = (action: any): string[] => {
        const boardIds: string[] = [];

        if (!action) return boardIds;

        // Check if current action has boardId in settings.input
        if (action.settings?.input?.boardId) {
            boardIds.push(action.settings.input.boardId);
        }

        // Check children array (for MULTIPLE_CHOICE type)
        if (action.children && Array.isArray(action.children)) {
            action.children.forEach((child: any) => {
                boardIds.push(...collectBoardIds(child));
            });
        }

        // Recursively check nextAction
        if (action.nextAction) {
            boardIds.push(...collectBoardIds(action.nextAction));
        }

        return boardIds;
    };

    const boardIds = collectBoardIds(workflow.version.trigger.nextAction);

    // Recursive function to traverse nextAction structure and collect workflowIds
    const collectWorkflowIds = (action: any): string[] => {
        const workflowIds: string[] = [];

        if (!action) return workflowIds;

        // Check if current action has workflowId in settings.input
        if (action.settings?.input?.workflowId) {
            workflowIds.push(action.settings.input.workflowId);
        }

        // Check children array (for MULTIPLE_CHOICE type)
        if (action?.children && Array.isArray(action.children)) {
            action.children.forEach((child: any) => {
                workflowIds.push(...collectWorkflowIds(child));
            });
        }

        // Recursively check nextAction
        if (action.nextAction) {
            workflowIds.push(...collectWorkflowIds(action.nextAction));
        }

        return workflowIds;
    };

    const assistantWorkflowIds = collectWorkflowIds(workflow.version.trigger.nextAction);

    // Recursive function to traverse nextAction structure and collect assistant_ids
    const collectAssistantIds = (action: any): Array<{ assistantId: string, workflowId: string }> => {
        const assistants: Array<{ assistantId: string, workflowId: string }> = [];

        if (!action) return assistants;

        // Check if current action has assistant_id in settings.input
        if (action.settings?.input?.assistant_id) {
            assistants.push({
                assistantId: action.settings.input.assistant_id.toString(),
                workflowId: ''
            });
        }

        // Check children array (for MULTIPLE_CHOICE type)
        if (action?.children && Array.isArray(action.children)) {
            action.children.forEach((child: any) => {
                assistants.push(...collectAssistantIds(child));
            });
        }

        // Recursively check nextAction
        if (action.nextAction) {
            assistants.push(...collectAssistantIds(action.nextAction));
        }

        return assistants;
    };


    const workflowAssistants = collectAssistantIds(workflow.version.trigger.nextAction);

    const assistants: {
        assistantId: string;
        workflowId: string;
    }[] = [];
    if (assistantWorkflowIds?.length > 0 && assistantWorkflows.length > 0) {

        assistantWorkflowIds.forEach(assistantWorkflowId => {
            const assistantWorkflow = assistantWorkflows.find(
                aw => aw.workflow_id === assistantWorkflowId as string
            );
            if (assistantWorkflow) {
                assistants.push({
                    assistantId: assistantWorkflow.assistant_id,
                    workflowId: assistantWorkflow.workflow_id,
                });
            }
        });
    }

    if (workflowAssistants && workflowAssistants.length > 0) {
        if (assistants?.length <= 0) {
            workflowAssistants.forEach(assistant => {
                assistants.push({
                    assistantId: assistant.assistantId ?? "",
                    workflowId: assistant.workflowId,
                });
            });
        } else {
            workflowAssistants.forEach(assistant => {
                const assistantWorkflow = assistants.find(
                    aw => aw.assistantId === assistant.assistantId
                );
                if (!assistantWorkflow && assistant?.assistantId) {
                    assistants.push({
                        assistantId: assistant.assistantId,
                        workflowId: assistant.workflowId,
                    });
                }
            });
        }

    }

    return {
        ...workflow,
        boardIds: boardIds as string[],
        assistantIds: assistants,
    };
}