import logger from '../../../server/logging/logger';
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import _Error, { handleServiceError } from '../../../utils/error';
import {
  AIAssistant,
  AssistantInstallOverrides,
  GuardRail,
} from '../../domains/interface/aiAssistant';
import { IAPWorkflowParameters } from '../../domains/interface/ap_workflow';
import { IChannel } from '../../domains/interface/channel';
import { BoardSchema } from '../../domains/interface/databoard';
import { IBoardTemplate } from '../../domains/interface/template';
import IUserContext from '../../domains/interface/userContext';
import { INode, IWorkflowParameters } from '../../domains/interface/types';
import { Coordinator } from '../../domains/template_v2/Coordinator';
import {
  Cloneable,
  IResource,
  ResourceType,
} from '../../domains/template_v2/interface';
import {
  AiAssistant,
  DocumentAI,
  DocumentAISchema,
  IAiAssistantParameters,
  Metadata,
} from '../../domains/template_v2/resources/AiAssistant';
import {
  Automation,
  AutomationParameters,
  AutomationType,
  TriggerFrequencyUnitType,
} from '../../domains/template_v2/resources/Automation';
import {
  Channel,
  ChannelParameters,
} from '../../domains/template_v2/resources/Channel';
import {
  DataBoard,
  IDataBoardParameters,
} from '../../domains/template_v2/resources/DataBoard';
import {
  IUseCaseParameters,
  UseCase,
} from '../../domains/template_v2/resources/UseCase';
import { Workflow } from '../../domains/template_v2/resources/Workflow';
import {
  cloneAssistantFiles,
  createAssistant,
  createGuardRail,
  getAssistantById,
  getAssistants,
  getGuardRails,
  getWorkflowsRelatedToAssistant,
  updateAssistant,
} from '../../repositories/ai.repository';
import {
  duplicateAPWorkflow,
  getAPWorkflow,
  getAPWorkflowResources,
  publishAPWorkflow,
  updateAPWorkflowTrigger,
} from '../../repositories/ap_workflow.repository';
import {
  createBoardAutomation,
  getAutomationByOrgId,
  getAutomationByOrgIdV2,
} from '../../repositories/automation';
import {
  createBoardAndFieldV3,
  getBoards,
  getBoardById,
  getDefaultBoards,
  exportCSV,
  importCSV,
  importCSVByContent,
  getDocSchemaById,
  createDocSchema,
  findDocSchemaByName,
  getDocCategories,
  createDocCategory,
  DocCategoryNode,
  DocCategoryType,
} from '../../repositories/boards.repository';
import {
  createChannel,
  createChannelV2,
  getChannelById,
  getChannels,
} from '../../repositories/channel.repository';
// Legacy workflow-engine functions removed — stubs to prevent import errors
const createNewWorkflow = async (..._args: any[]): Promise<any> => {
  throw new Error('workflow engine removed');
};
const getWorkflowResources = async (..._args: any[]): Promise<any[]> => {
  return [];
};
const updateWorkflow = async (..._args: any[]): Promise<any> => {
  throw new Error('workflow engine removed');
};
const getWorkflow = async (..._args: any[]): Promise<any> => {
  return undefined;
};
import {
  getFolders,
  createFolder,
  IKnowledgeHubFolder,
} from '../../repositories/knowledge_hub.repository';
import { v4 as uuid } from 'uuid';
import {
  TemplateRepositoryFactory,
  UseCaseRepositoryFactory,
} from '../../../infrastructure/repositories/factories';

const TEMPLATE_ORG_ID = 'template_org';

// Fetch a channel by id; on upstream 404 surface a meaningful 422 instead of
// propagating the raw 404 from channel-service (which would mislead the API
// client into thinking the marketplace template endpoint itself is missing).
const fetchChannelOrFail = async (orgID: string, channelId: string) => {
  try {
    const channel = await getChannelById(orgID, channelId);
    if (!channel) {
      throw new _Error(
        `Channel ${channelId} not found for organization ${orgID}`,
        422,
      );
    }
    return channel;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new _Error(
        `Channel ${channelId} not found for organization ${orgID}`,
        422,
      );
    }
    throw err;
  }
};

const crmboardTypes = [
  'Contacts',
  'Companies',
  'Opportunities',
  'Products',
  'Tasks',
];

const DOCUMENT_AI_PIECE = '@activepieces/piece-document-ai';

const applyDocumentAiOverridesToActionTree = (
  action: any,
  overrides: AssistantInstallOverrides,
): void => {
  if (!action) return;

  if (
    action?.settings?.pieceName === DOCUMENT_AI_PIECE &&
    action?.settings?.input &&
    typeof action.settings.input === 'object'
  ) {
    const input = action.settings.input;
    if (overrides.vlm_model !== undefined) input.modelName = overrides.vlm_model;
    if (overrides.vlm_provider_id !== undefined) input.visionProvider = overrides.vlm_provider_id;
    if (overrides.model_id !== undefined) input.processModelName = overrides.model_id;
    if (overrides.provider_id !== undefined) input.processingProvider = overrides.provider_id;
  }

  if (Array.isArray(action.children)) {
    action.children.forEach((child: any) =>
      applyDocumentAiOverridesToActionTree(child, overrides),
    );
  }
  if (action.nextAction) {
    applyDocumentAiOverridesToActionTree(action.nextAction, overrides);
  }
};

class BasicCloneable implements Cloneable {
  // Assuming data is an object that may store key/value pairs.
  private payload: Record<string, any>;
  constructor(payload: Record<string, any> = {}) {
    this.payload = payload;
  }
  clone(): this {
    // Return a new BasicCloneable with a shallow copy of payload (or deep copy if needed)
    return new BasicCloneable({ ...this.payload }) as this;
  }
  add(...deps: IResource[]): void {
    // logger.debug("Adding dependencies:", deps);
    // Merge dependency info, e.g., store dependency ids.
    if (!this.payload.dependencies) {
      this.payload.dependencies = [];
    }
    deps.forEach((dep) => this.payload.dependencies.push(dep.id));
  }
}
function getWebhookId(nodes: any[]): string {
  if (!nodes || nodes.length === 0) return '';
  const webhookNode = nodes.find((node) => node?.webhookId);
  if (!webhookNode) return '';
  return webhookNode.webhookId ?? '';
}

function replaceValueInObject(
  obj: any,
  target: string,
  replacement: string,
): any {
  if (typeof obj === 'string') {
    if (obj === target) return replacement;
    if (obj.indexOf(target) !== -1) return obj.split(target).join(replacement);
    return obj;
  }
  if (obj !== null && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map((item) => replaceValueInObject(item, target, replacement));
    }
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = replaceValueInObject(obj[key], target, replacement);
    }
    return newObj;
  }
  return obj;
}

function toIntOrUndefined(
  value: string | number | undefined,
): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  return /^\d+$/.test(value) ? parseInt(value, 10) : undefined;
}

function replaceChannelIdInDemoUrl(
  demoUrl: string,
  newChannelId: string,
): string {
  return demoUrl.replace(/(channel_id=)[^&]+/, `$1${newChannelId}`);
}

interface UpdateTemplateInputs {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  active?: boolean;
  updateGraph?: boolean;
  graph?: any;
}

async function enrichTableInTableFields(
  orgID: string,
  boards: BoardSchema[],
): Promise<BoardSchema[]> {
  const enrichedBoards = await Promise.all(
    boards.map(async (board) => {
      const enrichedFields = await Promise.all(
        board.fields.map(async (field) => {
          if (field.type === 'TableInTable' && field.data?.length > 0) {
            const childBoardId = field.data[0].value;
            try {
              const childBoard = await getBoardById(orgID, childBoardId);
              if (childBoard) {
                return { ...field, child_board_fields: childBoard.fields };
              }
            } catch (error) {
              logger.info(
                'enrichTableInTableFields: failed to fetch child board',
                { childBoardId, error },
              );
            }
          }
          return field;
        }),
      );
      return { ...board, fields: enrichedFields };
    }),
  );
  return enrichedBoards as BoardSchema[];
}

function createResource(
  id: string,
  name: string,
  type: ResourceType,
  payload: any,
): IResource {
  let data;
  switch (type) {
    case ResourceType.DATA_BOARD: {
      const input = payload as BoardSchema;
      data = new DataBoard({
        id: input.id,
        name: input.name,
        doc_name: input.doc_name ?? '',
        order: input.order ?? 0,
        hidden: input.hidden ?? false,
        type: input.type ?? '',
        csvData: (input as any).csvData,
        fields:
          input?.fields?.map((field) => {
            return {
              name: field.name,
              id: field.id,
              _id: field._id,
              description: field?.description,
              type: field.type,
              is_unique_identifier: field.is_unique_identifier,
              is_default: field.is_default,
              hidden: field.hidden,
              hidden_on_record: field.hidden,
              default_field_name: field.default_field_name,
              contact_field: field.contact_field,
              settings: field.settings,
              is_identifier: field?.is_identifier ?? false,
              data:
                field?.data?.map((data) => {
                  return {
                    value: data.value,
                    _id: data._id,
                  };
                }) ?? [],
              child_board_fields:
                field.type === 'TableInTable'
                  ? field.child_board_fields
                  : undefined,
            };
          }) ?? [],
      });
      break;
    }
    case ResourceType.AUTOMATION: {
      const input = payload as Automation;
      data = new Automation({
        _id: input._id,
        name: input.name,
        type: input.type,
        board_id: input.board_id,
        workflow_id: input.workflow_id,
        organization_id: input.organization_id,
        description: input.description,
        trigger_frequency_unit: input.trigger_frequency_unit,
        trigger_frequency_value: input.trigger_frequency_value,
        trigger_day_of_week: input.trigger_day_of_week,
        trigger_day_of_month: input.trigger_day_of_month,
        trigger_month_and_day: input.trigger_month_and_day,
        trigger_time: input.trigger_time,
        start_datetime: input.start_datetime,
        field_id: input.field_id,
      });
      break;
    }
    case ResourceType.WORKFLOW: {
      const input = payload as IWorkflowParameters;
      data = new Workflow({
        id: input.id ?? '',
        name: input.name,
        tags: input.tags,
        nodes: input.nodes ?? [],
        connections: input.connections,
        active: input.active,
        settings: input.settings,
        boardIds: input?.boardIds ?? [],
        assistantIds: input?.assistantIds ?? [],
        version: input?.version,
        metadata: input?.metadata,
      });
      break;
    }

    case ResourceType.AI_ASSISTANT: {
      const input = payload as AIAssistant;

      // Copy metadata verbatim so agent-specific settings (e.g.
      // max_token_limit) survive export; only other_requirements is normalised.
      const aiAssistantMeta: Metadata = {
        ...input.metadata,
        other_requirements:
          input.metadata.other_requirements?.map((requirement) => {
            return {
              author_avatar: requirement.author_avatar,
              author_name: requirement.author_name,
              message: requirement.message,
              updated_at: requirement.updated_at,
              requirement: requirement.requirement,
            };
          }) ?? [],
      };

      data = new AiAssistant({
        id: input.id ?? '',
        name: input.name,
        model: input.model,
        instructions: input.instructions,
        file_ids: input.file_ids,
        metadata: aiAssistantMeta,
        mode: input.mode,
        channel: input.channel,
        category: input.category,
        personality_role: input.personality_role,
        core_task: input.core_task,
        tone_and_style: input.tone_and_style,
        response_length: input.response_length,
        banned_words: input.banned_words,
        workflow_name: '',
        created_at: input.created_at,
        description: input.description,
        knowledge_hubs: input.knowledge_hubs ?? [],
        workflow_function_call: input.workflow_function_call ?? [],
        version: input?.version || 1,
        agent_type: input.agent_type,
        streaming: input.streaming,
        folder_ids: input.folder_ids,
        guardrail_id: input?.guardrail_id,
        board_ids: input?.board_ids,
        default_folder_id: input?.default_folder_id,
        sub_agents: input?.sub_agents ?? [],
        folders: (input as any)?.folders ?? [],
        document_ai: input?.document_ai,
      });
      break;
    }
    case ResourceType.CHANNEL: {
      const input = payload as IChannel;
      data = new Channel({
        doc_name: input.doc_name,
        name: input.name,
        active: input.active,
        is_deleted: input.is_deleted,
        is_replace: false,
        bot_id: input.bot_id,
        organization_id: input.organization_id,
        config: input.config,
        public_id: input.public_id ?? '',
        credential_id: input.credential_id ?? '',
        workflow_id: input.workflow_id ?? '',
        is_init: input.is_init,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        id: input.id ?? '',
      });
      break;
    }
    case ResourceType.USE_CASE: {
      const input = payload as IUseCaseParameters;
      data = new UseCase({
        id: input.id ?? '',
        title: input.title,
        description: input.description,
        tags: input.tags,
        short_description: input.short_description,
        thumbnail_url: input.thumbnail_url,
        hover_thumbnail_url: input.hover_thumbnail_url,
        media: input?.media ?? [],
        video_url: input?.video_url ?? '',
        demo_url: input.demo_url,
        demo_image_url: input.demo_image_url,
        how_it_works: input?.how_it_works ?? [],
        features: input?.features ?? [],
        organization_id: input.organization_id,
        suggestion_prompts: input?.suggestion_prompts ?? [],
        supported_channels:
          input?.supported_channels?.map((channel: any) => ({
            title: channel.title ?? '',
            icon: channel.icon ?? '',
          })) ?? [],
        integrations:
          input?.integrations?.map((integration) => ({
            title: integration.title ?? '',
            icon: integration.icon ?? '',
          })) ?? [],
        template_id: input.template_id,
        assistant_id: input?.assistant_id ?? '',
        user_id: input?.user_id ?? '',
        channel_id: input?.channel_id ?? '',
        version: input?.version ?? 1,
        agent_type: input?.agent_type ?? 'agent',
      });
      break;
    }
    default:
      data = new BasicCloneable(payload);
      break;
  }
  const resource: IResource = {
    id,
    name,
    type,
    data,
  };
  return resource;
}

async function cloneResource(
  orgID: string,
  original: IResource,
  newID: string,
  isCloneBoardItems: boolean,
  sharedFolderIdMap?: Map<string, string>,
  clonedNodesMap?: Map<string, IResource>,
  overrides?: AssistantInstallOverrides,
): Promise<IResource> {
  try {
    let newResource: IResource = {
      ...original,
    };

    switch (original.type) {
      case ResourceType.DATA_BOARD:
        {
          const databoard = new DataBoard(
            original.data as unknown as IDataBoardParameters,
          );
          const clonedDataboardInput =
            databoard.clone() as IDataBoardParameters;
          const newBoardName = ` ${clonedDataboardInput.name} ${newID}`;
          const databoardInput: IBoardTemplate = {
            boardName: newBoardName,
            name: newBoardName,
            organization_id: orgID,
            type: clonedDataboardInput.type,
            fields:
              clonedDataboardInput.fields?.map((field) => {
                return {
                  name: `${field.name}`,
                  description: field?.description ?? '',
                  type: field.type,
                  is_unique_identifier: field.is_unique_identifier,
                  is_default: field.is_default,
                  hidden: field.hidden,
                  is_identifier: field?.is_identifier ?? false,
                  data:
                    field?.data?.map((data) => {
                      return {
                        value: data.value,
                      };
                    }) ?? [],
                  fields:
                    field.type === 'TableInTable'
                      ? field.child_board_fields
                      : undefined,
                };
              }) ?? [],
          };

          let newDataboardData;
          if (crmboardTypes.includes(clonedDataboardInput.type)) {
            const crmBoards = await getDefaultBoards(orgID);
            newDataboardData = crmBoards.find(
              (board) => board.type === clonedDataboardInput.type,
            );
          } else {
            newDataboardData = await createBoardAndFieldV3(
              orgID,
              databoardInput,
            );
          }

          if (!newDataboardData) {
            throw new Error('Failed to create new databoard');
          }

          if (isCloneBoardItems && clonedDataboardInput?.csvData) {
            const { download_url, content } =
              (clonedDataboardInput as any).csvData || {};
            try {
              if (content && content !== '') {
                await importCSVByContent(newDataboardData._id!, content);
              } else if (download_url) {
                await importCSV(newDataboardData._id!, download_url);
              }
            } catch (csvErr) {
              logger.warn(
                `Failed to import CSV for board ${newDataboardData._id}; continuing without items`,
                csvErr,
              );
            }
          }

          newResource = {
            id: newDataboardData._id ?? '',
            name: newDataboardData.name,
            type: ResourceType.DATA_BOARD,
            data: new DataBoard({
              id: newDataboardData._id ?? '',
              name: newDataboardData.name,
              doc_name: newDataboardData.doc_name ?? '',
              order: newDataboardData.order ?? 0,
              hidden: newDataboardData.hidden ?? false,
              type: newDataboardData.type ?? '',
              fields:
                newDataboardData?.fields?.map((field) => {
                  return {
                    _id: field?._id,
                    id: field?._id,
                    name: field.name,
                    description: field?.description,
                    type: field.type,
                    is_unique_identifier: field.is_unique_identifier,
                    is_default: field.is_default,
                    hidden: field.hidden,
                    hidden_on_record: field.hidden,
                    default_field_name: field.default_field_name,
                    contact_field: field.contact_field,
                    settings: field.settings,
                    is_identifier: field?.is_identifier ?? false,
                    data:
                      field?.data?.map((data) => {
                        return {
                          value: data.value,
                          _id: data._id,
                        };
                      }) ?? [],
                    child_board_fields:
                      field.type === 'TableInTable'
                        ? field.child_board_fields
                        : undefined,
                  };
                }) ?? [],
            }),
          };
        }
        // Clone DataBoard
        break;
      case ResourceType.AUTOMATION: {
        break;
      }
      case ResourceType.WORKFLOW: {
        // Clone Workflow
        const workflow = new Workflow(
          original.data as unknown as IWorkflowParameters,
        );
        const clonedAutomationInput = workflow.clone();
        let newWorkflowName = `${clonedAutomationInput.name} ${newID}`;
        if (newWorkflowName.length > 100) {
          newWorkflowName = newWorkflowName.substring(0, 100);
        }

        let newNodes = clonedAutomationInput.nodes;

        // If workflow.id is present and is NOT a number, treat it as an AP workflow and duplicate it.
        if (workflow?.id && toIntOrUndefined(workflow.id) === undefined) {
          const newAPWorkflow = await duplicateAPWorkflow(
            orgID,
            clonedAutomationInput,
            newWorkflowName,
          );
          if (!newAPWorkflow) {
            throw new Error('Failed to create new workflow');
          }

          newResource = {
            id: newAPWorkflow.id ?? '',
            name: newAPWorkflow.name ?? '',
            type: ResourceType.WORKFLOW,
            data: new Workflow({
              id: newAPWorkflow.id,
              name: newAPWorkflow.name,
              tags: [],
              nodes: [],
              connections: {},
              active: true,
              settings: {},
              boardIds: clonedAutomationInput.boardIds,
              assistantIds: clonedAutomationInput.assistantIds,
              version: newAPWorkflow?.version,
            }),
          };

          break;
        } else {
          const oldWebhookId = getWebhookId(newNodes);
          if (oldWebhookId) {
            const newWebhookId = uuid();
            logger.info('newWebhookId', { newWebhookId, oldWebhookId });
            newNodes = replaceValueInObject(
              newNodes,
              oldWebhookId,
              newWebhookId,
            );
          }
          const newWorkflow = await createNewWorkflow(
            {
              id: '',
              name: newWorkflowName,
              tags: clonedAutomationInput.tags,
              nodes: newNodes,
              connections: clonedAutomationInput.connections,
              active: clonedAutomationInput.active,
              settings: clonedAutomationInput.settings,
            },
            {
              org_id: orgID,
              business_unit_id: '',
            },
          );
          if (!newWorkflow) {
            throw new Error('Failed to create new workflow');
          }

          newResource = {
            id: newWorkflow.id ?? '',
            name: newWorkflow.name ?? '',
            type: ResourceType.WORKFLOW,
            data: new Workflow({
              id: newWorkflow.id,
              name: newWorkflow.name,
              tags: newWorkflow.tags,
              nodes: newWorkflow.nodes,
              connections: newWorkflow.connections,
              active: newWorkflow.active,
              settings: newWorkflow.settings,
              boardIds: clonedAutomationInput.boardIds,
              assistantIds: clonedAutomationInput.assistantIds,
            }),
          };

          break;
        }
      }

      case ResourceType.AI_ASSISTANT: {
        const assistant = new AiAssistant(
          original.data as unknown as IAiAssistantParameters,
        );
        const clonedAssistantInput = assistant.clone();
        const newAssistantName = `${clonedAssistantInput.name} ${newID}`;
        let workflowName = `${clonedAssistantInput.mode} | ${newAssistantName}`;
        if (workflowName.length > 100) {
          workflowName = workflowName.substring(0, 100);
        }

        // Create folders from template data and build ID mapping
        // Use shared map to avoid duplicating folders across assistants
        const folderIdMap = sharedFolderIdMap ?? new Map<string, string>();
        if (clonedAssistantInput?.folders?.length) {
          const folderIds = new Set(
            clonedAssistantInput.folders.map((f) => f._id),
          );
          const sorted = [
            ...clonedAssistantInput.folders.filter(
              (f) => !folderIds.has(f.parent_folder_id),
            ),
            ...clonedAssistantInput.folders.filter((f) =>
              folderIds.has(f.parent_folder_id),
            ),
          ];

          for (const folder of sorted) {
            // Skip if this folder was already created by another assistant
            if (folderIdMap.has(folder._id)) {
              continue;
            }
            const newFolder = await createFolder(orgID, {
              name: folder.name,
              description: folder.description,
              tags: folder.tags,
              parent_folder_id:
                folderIdMap.get(folder.parent_folder_id) ??
                folder.parent_folder_id,
              source_type: folder.source_type,
              auto_tagging: true,
            });
            folderIdMap.set(folder._id, newFolder._id);
          }
        }
        const newFolderIds = (clonedAssistantInput?.folder_ids ?? []).map(
          (id) => folderIdMap.get(id) ?? id,
        );
        const newDefaultFolderId = clonedAssistantInput?.default_folder_id
          ? (folderIdMap.get(clonedAssistantInput.default_folder_id) ??
            clonedAssistantInput.default_folder_id)
          : undefined;

        // document_ai.schemas (Document AI) are recreated later in
        // updateClonedResourceReferences, where both the new boards and this
        // assistant id exist — a doc_schema links to both. So the schemas are
        // kept on the stored node (resolvedDocumentAi, see below) for that pass,
        // but stripped from the create call: the new schema_ids/board_ids don't
        // exist yet and we don't want stale source-org refs persisted.
        const resolvedDocumentAi = clonedAssistantInput?.document_ai;

        // Only emit document_ai when the template provided one OR an override
        // sets a vlm field — otherwise leave it undefined so the AI backend
        // does not receive a spurious empty object for non-document_ai assistants.
        const mergedDocumentAi =
          resolvedDocumentAi || overrides?.vlm_model || overrides?.vlm_provider_id
            ? {
                ...(resolvedDocumentAi ?? {}),
                schemas: undefined,
                ...(overrides?.vlm_model
                  ? { vlm_model: overrides.vlm_model }
                  : {}),
                ...(overrides?.vlm_provider_id
                  ? { vlm_provider_id: overrides.vlm_provider_id }
                  : {}),
              }
            : undefined;
        // Strip any legacy top-level board_id carried over from the source
        // template so the freshly-created agent isn't born with a stale
        // cross-org reference (schemas are provisioned later in the update pass).
        if (mergedDocumentAi) delete (mergedDocumentAi as any).board_id;

        const newAssistant = await createAssistant(orgID, {
          name: newAssistantName,
          model: clonedAssistantInput.model,
          instructions: clonedAssistantInput.instructions,
          file_ids: [],
          metadata: clonedAssistantInput.metadata,
          mode: clonedAssistantInput.mode,
          model_id: overrides?.model_id ?? 'Default',
          ...(overrides?.provider_id
            ? { provider_id: overrides.provider_id }
            : {}),
          channel: clonedAssistantInput.channel,
          category: clonedAssistantInput.category,
          personality_role: clonedAssistantInput.personality_role,
          core_task: clonedAssistantInput.core_task,
          tone_and_style: clonedAssistantInput.tone_and_style,
          response_length: clonedAssistantInput.response_length,
          banned_words: clonedAssistantInput.banned_words,
          workflow_name: workflowName,
          created_at: clonedAssistantInput.created_at,
          description: clonedAssistantInput.description,
          knowledge_hubs: clonedAssistantInput.knowledge_hubs,
          workflow_function_call: clonedAssistantInput.workflow_function_call,
          version: clonedAssistantInput.version,
          agent_type: clonedAssistantInput.agent_type,
          streaming: clonedAssistantInput.streaming,
          guardrail_id: clonedAssistantInput?.guardrail_id,
          board_ids: clonedAssistantInput?.board_ids,
          sub_agents: clonedAssistantInput?.sub_agents,
          folder_ids: newFolderIds,
          default_folder_id: newDefaultFolderId,
          document_ai: mergedDocumentAi,
          vibe_code: clonedAssistantInput.vibe_code ?? false,
        });
        if (!newAssistant) {
          throw new Error('Failed to create new assistant');
        }
        newResource = {
          id: newAssistant.id ?? '',
          name: newAssistant.name,
          type: ResourceType.AI_ASSISTANT,
          data: new AiAssistant({
            id: newAssistant.id ?? '',
            name: newAssistant.name,
            model: newAssistant.model,
            instructions: newAssistant.instructions,
            file_ids: newAssistant.file_ids,
            metadata: newAssistant.metadata,
            mode: newAssistant.mode,
            channel: newAssistant.channel,
            category: newAssistant.category,
            personality_role: newAssistant.personality_role,
            core_task: newAssistant.core_task,
            tone_and_style: newAssistant.tone_and_style,
            response_length: newAssistant.response_length,
            banned_words: newAssistant.banned_words,
            workflow_name: workflowName,
            created_at: newAssistant.created_at,
            description: newAssistant.description,
            knowledge_hubs: newAssistant.knowledge_hubs ?? [],
            workflow_function_call: newAssistant.workflow_function_call ?? [],
            original_assistant_id:
              clonedAssistantInput?.file_ids &&
              clonedAssistantInput?.file_ids?.length > 0
                ? clonedAssistantInput?.id
                : undefined,
            version: newAssistant?.version || 1,
            agent_type: clonedAssistantInput?.agent_type,
            streaming: clonedAssistantInput?.streaming,
            guardrail_id: clonedAssistantInput?.guardrail_id,
            board_ids: clonedAssistantInput?.board_ids ?? [],
            default_folder_id: newDefaultFolderId,
            folder_ids: newFolderIds,
            sub_agents: clonedAssistantInput?.sub_agents ?? [],
            document_ai: resolvedDocumentAi,
          }),
        };
        break;
      }
      case ResourceType.ORGANIZATION:
        newResource.id = orgID;
        break;
      case ResourceType.CHANNEL: {
        const channel = new Channel(
          original.data as unknown as ChannelParameters,
        );
        const clonedChannel = channel.clone();
        let newChannelName = `${clonedChannel.name} ${newID}`;
        if (newChannelName.length > 100) {
          newChannelName = newChannelName.substring(0, 100);
        }

        let newChannel: IChannel;

        if (toIntOrUndefined(clonedChannel.workflow_id) === undefined) {
          newChannel = await createChannelV2(orgID, {
            name: newChannelName,
            active: true,
            is_deleted: false,
            bot_id: clonedChannel.bot_id,
            organization_id: orgID,
            config: clonedChannel.config,
            is_init: clonedChannel.is_init,
            errorCode: clonedChannel.errorCode,
            errorMessage: clonedChannel.errorMessage,
            doc_name: clonedChannel.doc_name,
            touchpoints: [],
          });
        } else {
          newChannel = await createChannel(orgID, {
            name: newChannelName,
            active: true,
            is_deleted: false,
            bot_id: clonedChannel.bot_id,
            organization_id: orgID,
            config: clonedChannel.config,
            is_init: clonedChannel.is_init,
            errorCode: clonedChannel.errorCode,
            errorMessage: clonedChannel.errorMessage,
            doc_name: clonedChannel.doc_name,
            touchpoints: [],
          });

          if (!newChannel) {
            throw new Error('Failed to create new channel');
          }
        }

        newResource = {
          id: newChannel.id ?? newChannel._id ?? '',
          name: newChannel.name,
          type: ResourceType.CHANNEL,
          data: new Channel({
            id: newChannel.id ?? newChannel._id ?? '',
            name: newChannel.name,
            active: newChannel.active,
            is_deleted: newChannel.is_deleted,
            bot_id: newChannel.bot_id,
            organization_id: orgID,
            config: newChannel.config,
            public_id: `${clonedChannel.organization_id}//${clonedChannel.workflow_id}`,
            credential_id: newChannel.credential_id ?? '',
            workflow_id: newChannel.workflow_id ?? '',
            is_init: newChannel.is_init,
            errorCode: newChannel.errorCode,
            errorMessage: newChannel.errorMessage,
            doc_name: newChannel.doc_name ?? '',
            business_unit_id: newChannel.business_unit_id,
          }),
        };

        break;
      }

      case ResourceType.USE_CASE: {
        const usecase = new UseCase(
          original.data as unknown as IUseCaseParameters,
        );
        const clonedUseCase = usecase.clone();
        let newUsecaseName = `${clonedUseCase.title}`;
        if (newID && newID !== '') {
          newUsecaseName = `${clonedUseCase.title} ${newID}`;
        }
        if (newUsecaseName.length > 100) {
          newUsecaseName = newUsecaseName.substring(0, 100);
        }

        const useCaseRepo = UseCaseRepositoryFactory.create();
        const existingUseCases = await useCaseRepo.findAll({
          search: newUsecaseName,
        });

        const duplicate = existingUseCases.find(
          (uc: any) =>
            uc.title === newUsecaseName &&
            uc.organization_id === orgID &&
            !uc.is_deleted,
        );

        if (duplicate) {
          throw new Error(
            `UseCase with title ${clonedUseCase?.title} already exists in organization ${orgID}`,
          );
        }

        const { id: _originalId, ...clonedUseCaseWithoutId } = clonedUseCase;
        const newUseCase = await useCaseRepo.create({
          ...clonedUseCaseWithoutId,
          title: newUsecaseName,
          organization_id: orgID,
          type: 'custom',
        });

        if (!newUseCase) {
          throw new Error('Failed to create new use case');
        }

        newResource = {
          id: newUseCase.id ?? '',
          name: newUseCase.title,
          type: ResourceType.USE_CASE,
          data: new UseCase({
            id: newUseCase.id ?? '',
            title: newUseCase.title,
            description: newUseCase?.description ?? '',
            tags: newUseCase?.tags ?? [],
            short_description: newUseCase?.short_description ?? '',
            thumbnail_url: newUseCase?.thumbnail_url ?? '',
            hover_thumbnail_url: newUseCase?.hover_thumbnail_url ?? '',
            media: newUseCase?.media ?? [],
            video_url: newUseCase?.video_url ?? '',
            demo_url: newUseCase?.demo_url ?? '',
            organization_id: orgID,
            demo_image_url: newUseCase?.demo_image_url ?? '',
            how_it_works: newUseCase?.how_it_works ?? [],
            features: newUseCase?.features ?? [],
            suggestion_prompts: newUseCase?.suggestion_prompts ?? [],
            supported_channels:
              newUseCase?.supported_channels?.map((channel: any) => ({
                title: channel.title ?? '',
                icon: channel.icon ?? '',
              })) ?? [],
            integrations:
              newUseCase?.integrations?.map((integration: any) => ({
                title: integration.title ?? '',
                icon: integration.icon ?? '',
              })) ?? [],
            template_id: newUseCase?.template_id ?? '',
            assistant_id: newUseCase?.assistant_id ?? '',
            user_id: newUseCase?.user_id ?? '',
            channel_id: newUseCase?.channel_id ?? '',
            version: newUseCase?.version ?? 1,
            agent_type: newUseCase?.agent_type ?? 'agent',
          }),
        };

        break;
      }
      default:
        throw new Error('Invalid type');
    }

    return newResource;
  } catch (error) {
    logger.info('cloneResource Error: ', { error });
    throw handleServiceError(error);
  }
}

const updateClonedResourceReferences = async (
  orgID: string,
  resource: IResource,
  clonedNodesMap: Map<string, IResource>,
  originalNodes: Coordinator,
  newID: string,
  deps: any,
  overrides?: AssistantInstallOverrides,
): Promise<IResource> => {
  try {
    const data: any = resource.data;
    // Update workflow reference fields.
    if (resource.type === ResourceType.WORKFLOW && data) {
      if (Array.isArray(data.boardIds) && data.boardIds.length > 0) {
        data.boardIds = data.boardIds.map((origId: string) => {
          const cloned = clonedNodesMap.get(`databoard-${origId}`);
          return cloned ? `${origId}//${cloned.id}` : origId;
        });
      }
      if (Array.isArray(data.assistantIds) && data.assistantIds.length > 0) {
        data.assistantIds = data.assistantIds.map((data: any) => {
          const { assistantId } = data;
          const cloned = clonedNodesMap.get(`assistant-${assistantId}`);
          const clonedAssistant =
            cloned?.data as unknown as IAiAssistantParameters;
          let newWorkflowID;
          if (
            clonedAssistant?.metadata &&
            clonedAssistant.metadata?.workflow_id
          ) {
            newWorkflowID = clonedAssistant.metadata.workflow_id;
          }

          return cloned && newWorkflowID
            ? {
                assistantId: `${assistantId}//${cloned.id}`,
                workflowId: newWorkflowID,
              }
            : data;
        });
      }
    }

    if (resource.type === ResourceType.AUTOMATION && data) {
      const clonedBoard = clonedNodesMap.get(`databoard-${data.board_id}`);
      if (clonedBoard) {
        data.board_id = `${data.board_id}//${clonedBoard.id}`;
      }
      const clonedWorkflow = clonedNodesMap.get(`workflow-${data.workflow_id}`);
      if (clonedWorkflow) {
        data.workflow_id = clonedWorkflow.id;
      }
    }

    if (resource.type === ResourceType.AI_ASSISTANT && data) {
      if (data?.board_ids && data.board_ids.length > 0) {
        data.board_ids = data.board_ids.map((boardId: string) => {
          const clonedBoard = clonedNodesMap.get(`databoard-${boardId}`);
          return clonedBoard ? `${boardId}//${clonedBoard.id}` : boardId;
        });
      } else if (data.knowledge_hubs && data.knowledge_hubs.length > 0) {
        const clonedBoard = clonedNodesMap.get(
          `databoard-${data.knowledge_hubs[0]}`,
        );
        if (clonedBoard) {
          data.knowledge_hubs = [
            `${data.knowledge_hubs[0]}//${clonedBoard.id}`,
          ];
        }
      }

      // document_ai.schemas are remapped + their doc_schemas recreated in this
      // function's AI_ASSISTANT switch case below (needs the new assistant id),
      // so no board_id prep is done here.

      if (data.sub_agents && data.sub_agents.length > 0) {
        data.sub_agents = data.sub_agents.map((subAgent: string) => {
          const clonedAssistant = clonedNodesMap.get(`assistant-${subAgent}`);
          return clonedAssistant
            ? `${subAgent}//${clonedAssistant.id}`
            : subAgent;
        });
      }

      if (
        data.workflow_function_call &&
        data.workflow_function_call.length > 0
      ) {
        data.new_workflow_function_call = data.workflow_function_call.map(
          (workflowId: string) => {
            const clonedWorkflow = clonedNodesMap.get(`workflow-${workflowId}`);
            return clonedWorkflow
              ? `${workflowId}//${clonedWorkflow.id}`
              : workflowId;
          },
        );
      }
    }

    if (resource.type === ResourceType.USE_CASE && data) {
      // Lookup tolerant to prefix differences across template formats
      // (imbrace export uses "ch_<uuid>" in use_case.channel_id but the
      // channel resource is keyed by "channel-<uuid>" without "ch_").
      const findClonedByInnerId = (
        nodePrefix: string,
        rawId: string | undefined,
      ): IResource | undefined => {
        if (!rawId) return undefined;
        const candidates = [
          `${nodePrefix}-${rawId}`,
          `${nodePrefix}-${rawId.replace(/^ch_/, '')}`,
          `${nodePrefix}-${rawId.replace(/^assistant_/, '')}`,
        ];
        for (const key of candidates) {
          const hit = clonedNodesMap.get(key);
          if (hit) return hit;
        }
        // Fallback: scan map by inner data.id (handles arbitrary prefixes)
        const normalized = rawId.replace(/^[a-z]+_/, '');
        for (const node of clonedNodesMap.values()) {
          const innerId = (node.data as any)?.id ?? '';
          if (innerId === rawId || innerId === normalized) return node;
        }
        return undefined;
      };

      const clonedAssistant = findClonedByInnerId(
        'assistant',
        data.assistant_id,
      );
      if (clonedAssistant) {
        data.assistant_id = `${data.assistant_id}//${clonedAssistant.id}`;
      }

      const clonedChannel = findClonedByInnerId('channel', data.channel_id);
      if (clonedChannel) {
        data.channel_id = `${data.channel_id}//${clonedChannel.id}`;
      }
    }

    switch (resource.type) {
      case ResourceType.WORKFLOW: {
        // Clone Workflow
        const workflow = new Workflow(
          resource.data as unknown as IWorkflowParameters,
        );
        const clonedAutomationInput = workflow.clone();
        const boardIds = clonedAutomationInput.boardIds;
        const assistantIds = clonedAutomationInput.assistantIds;

        if (workflow?.id && toIntOrUndefined(workflow.id) === undefined) {
          // Replace all board IDs, field IDs, and assistant IDs using stringify → replace → parse
          let versionData = clonedAutomationInput.version as any;
          if (versionData?.trigger?.nextAction) {
            let versionDataStr = JSON.stringify(versionData);

            // Build board pairs from boardIds if available
            const boardPairs: {
              originalBoardData: IDataBoardParameters;
              newBoardData: IDataBoardParameters;
            }[] = [];
            if (boardIds && boardIds.length > 0) {
              boardIds.forEach((boardIdEntry: string) => {
                const [origId] = boardIdEntry.split('//');
                const originalBoard = originalNodes.findResource(
                  `databoard-${origId}`,
                );
                const newBoard = clonedNodesMap.get(`databoard-${origId}`);
                if (originalBoard && newBoard) {
                  boardPairs.push({
                    originalBoardData:
                      originalBoard.data as unknown as IDataBoardParameters,
                    newBoardData:
                      newBoard.data as unknown as IDataBoardParameters,
                  });
                }
              });
            }

            // Also scan ALL databoards in the template to catch field IDs
            // from boards not listed in boardIds
            const allOriginalBoards =
              originalNodes.getNodesStartingWith('databoard-');
            allOriginalBoards.forEach((originalBoard) => {
              const newBoard = clonedNodesMap.get(originalBoard.id);
              if (newBoard) {
                const alreadyIncluded = boardPairs.some(
                  (bp) =>
                    bp.originalBoardData.id ===
                    (originalBoard.data as unknown as IDataBoardParameters).id,
                );
                if (!alreadyIncluded) {
                  boardPairs.push({
                    originalBoardData:
                      originalBoard.data as unknown as IDataBoardParameters,
                    newBoardData:
                      newBoard.data as unknown as IDataBoardParameters,
                  });
                }
              }
            });

            // Replace board IDs and their field IDs
            boardPairs.forEach(({ originalBoardData, newBoardData }) => {
              versionDataStr = versionDataStr
                .split(originalBoardData.id)
                .join(newBoardData.id);
              if (
                originalBoardData?.fields?.length > 0 &&
                newBoardData?.fields?.length > 0
              ) {
                originalBoardData.fields.forEach((field: any) => {
                  const newField = newBoardData.fields.find(
                    (f: any) => f.name === field.name && f.type === field.type,
                  );
                  if (newField?._id && field._id) {
                    versionDataStr = versionDataStr
                      .split(field._id)
                      .join(newField._id);
                  }
                });
              }
            });

            // Replace assistant IDs
            assistantIds?.forEach((assistantIdEntry: any) => {
              const [origId, clonedId] =
                assistantIdEntry.assistantId.split('//');
              if (origId && clonedId) {
                versionDataStr = versionDataStr.split(origId).join(clonedId);
              }
            });

            versionData = JSON.parse(versionDataStr);

            // Apply assistant-install overrides to any @activepieces/piece-document-ai
            // step inside the cloned trigger tree. Mutates in place; no-op when
            // overrides is undefined or has no relevant fields set.
            if (
              overrides &&
              (overrides.model_id !== undefined ||
                overrides.provider_id !== undefined ||
                overrides.vlm_model !== undefined ||
                overrides.vlm_provider_id !== undefined) &&
              versionData?.trigger
            ) {
              applyDocumentAiOverridesToActionTree(
                versionData.trigger,
                overrides,
              );
            }

            // Update the version back to the cloned workflow
            clonedAutomationInput.version = versionData;

            await updateAPWorkflowTrigger(
              orgID,
              versionData.flowId ?? clonedAutomationInput.id,
              versionData.trigger,
            );
            resource = {
              ...resource,
              data: new Workflow({
                id: clonedAutomationInput.id,
                name: clonedAutomationInput.name,
                tags: [],
                nodes: [],
                connections: {},
                active: true,
                settings: {},
                boardIds: clonedAutomationInput.boardIds,
                assistantIds: clonedAutomationInput.assistantIds,
              }),
            };
            await publishAPWorkflow(
              orgID,
              workflow?.id,
              clonedAutomationInput.name ?? '',
            );

            break;
          }
        } else {
          if (
            clonedAutomationInput?.nodes &&
            clonedAutomationInput?.nodes?.length > 0
          ) {
            // For each node, search for occurrences of each board id value (before the "//")
            clonedAutomationInput.nodes = clonedAutomationInput.nodes.map(
              (node: any) => {
                // For each board id in the workflow's boardIds array,
                // extract the original board id and the cloned board id, then update the node.
                boardIds?.forEach((boardIdEntry: string) => {
                  const [origId, clonedId] = boardIdEntry.split('//');

                  // Replace any property value that equals origId with clonedId.
                  node = replaceValueInObject(node, origId, clonedId);

                  const newBoard = clonedNodesMap.get(`databoard-${origId}`);
                  const originalBoard = originalNodes.findResource(
                    `databoard-${origId}`,
                  );
                  if (newBoard && originalBoard) {
                    const newboardData =
                      newBoard.data as unknown as IDataBoardParameters;
                    // logger.info("newBoardDAta", newboardData.fields);

                    const originalBoardData =
                      originalBoard.data as unknown as IDataBoardParameters;
                    // logger.info("originalBoardData", originalBoardData.fields);

                    originalBoardData.fields.forEach((field: any) => {
                      const fieldId = field._id;
                      // const fieldId = field.id;
                      const newField = newboardData.fields.find(
                        (f) => f.name === field.name && f.type === field.type,
                      );

                      if (newField && newField?.id && fieldId) {
                        node = replaceValueInObject(
                          node,
                          fieldId,
                          newField?._id ?? '',
                        );
                      }
                    });
                    // const newBoard = await getBoardById(orgID, clonedId);
                  }
                });

                assistantIds?.forEach((assistantIdEntry: any) => {
                  const [origId] = assistantIdEntry.assistantId.split('//');
                  const originalAssistant = originalNodes.findResource(
                    `assistant-${origId}`,
                  );
                  const newAssistant = clonedNodesMap.get(
                    `assistant-${origId}`,
                  );
                  if (originalAssistant && newAssistant) {
                    const originalAssistantData =
                      originalAssistant.data as unknown as IAiAssistantParameters;
                    const newAssistantData =
                      newAssistant.data as unknown as IAiAssistantParameters;
                    if (
                      originalAssistantData?.metadata &&
                      newAssistantData?.metadata &&
                      originalAssistantData?.metadata?.workflow_id &&
                      newAssistantData?.metadata?.workflow_id
                    ) {
                      node = replaceValueInObject(
                        node,
                        originalAssistantData.metadata.workflow_id,
                        newAssistantData.metadata.workflow_id,
                      );
                      node = replaceValueInObject(
                        node,
                        originalAssistantData.id,
                        newAssistantData.id,
                      );
                    }
                  }
                });
                return node;
              },
            );
          }

          let newNodes = clonedAutomationInput.nodes;
          const oldWebhookId = getWebhookId(newNodes);
          if (oldWebhookId) {
            const newWebhookId = uuid();
            logger.info('newWebhookId', { newWebhookId, oldWebhookId });
            newNodes = replaceValueInObject(
              newNodes,
              oldWebhookId,
              newWebhookId,
            );
          }

          const updatedWorkflow = await updateWorkflow(
            {
              id: clonedAutomationInput.id,
              name: clonedAutomationInput.name,
              tags: clonedAutomationInput.tags,
              nodes: newNodes,
              connections: clonedAutomationInput.connections,
              active: clonedAutomationInput.active,
              settings: clonedAutomationInput.settings,
            },
            orgID,
          );
          if (!updatedWorkflow) {
            throw new Error('Failed to create new workflow');
          }

          resource = {
            ...resource,
            data: new Workflow({
              id: updatedWorkflow.id,
              name: updatedWorkflow.name,
              tags: updatedWorkflow.tags,
              nodes: updatedWorkflow.nodes,
              connections: updatedWorkflow.connections,
              active: updatedWorkflow.active,
              settings: updatedWorkflow.settings,
              boardIds: clonedAutomationInput.boardIds,
              assistantIds: clonedAutomationInput.assistantIds,
            }),
          };

          break;
        }
        break;
      }

      case ResourceType.AUTOMATION: {
        // Clone Automation
        const automation = new Automation(
          resource.data as unknown as AutomationParameters,
        );
        const clonedAutomationInput = automation.clone();
        const newAutomationName = ` ${clonedAutomationInput.name} ${newID}`;
        let updatedFieldId: string | undefined;
        const [origId, clonedBoardId] =
          clonedAutomationInput.board_id.split('//');

        if (clonedAutomationInput.type === 'update') {
          const originalBoard = originalNodes.findResource(
            `databoard-${origId}`,
          );
          const newBoard = clonedNodesMap.get(`databoard-${origId}`);
          logger.info('AUTOMATION field_id debug:', {
            origId,
            clonedBoardId,
            automationFieldId: clonedAutomationInput.field_id,
            automationFieldIdType: typeof clonedAutomationInput.field_id,
            originalBoardFound: !!originalBoard,
            newBoardFound: !!newBoard,
          });
          if (originalBoard && newBoard) {
            const originalBoardData =
              originalBoard.data as unknown as IDataBoardParameters;
            const newBoardData =
              newBoard.data as unknown as IDataBoardParameters;

            logger.info('AUTOMATION field matching debug:', {
              originalFieldIds: originalBoardData.fields.map((f: any) => ({
                _id: f._id,
                _idType: typeof f._id,
                name: f.name,
              })),
              newFieldIds: newBoardData.fields.map((f: any) => ({
                _id: f._id,
                _idType: typeof f._id,
                name: f.name,
              })),
            });

            const originalField = originalBoardData.fields.find(
              (field) => field._id === clonedAutomationInput.field_id,
            );
            const newField = newBoardData.fields.find(
              (field) =>
                field.name === originalField?.name &&
                field.type === originalField?.type,
            );

            logger.info('AUTOMATION field result debug:', {
              originalFieldFound: !!originalField,
              originalFieldName: originalField?.name,
              newFieldFound: !!newField,
              newFieldId: newField?._id,
            });

            updatedFieldId = newField?._id ?? '';
          }
        }

        const newAutomation = await createBoardAutomation(orgID, {
          name: newAutomationName,
          organization_id: orgID,
          board_id: clonedBoardId,
          workflow_id: clonedAutomationInput.workflow_id,
          description: clonedAutomationInput.description,
          trigger_frequency_unit: clonedAutomationInput.trigger_frequency_unit,
          trigger_frequency_value:
            clonedAutomationInput.trigger_frequency_value,
          trigger_day_of_week: clonedAutomationInput.trigger_day_of_week,
          trigger_day_of_month: clonedAutomationInput.trigger_day_of_month,
          trigger_month_and_day: clonedAutomationInput.trigger_month_and_day,
          trigger_time: clonedAutomationInput.trigger_time,
          start_datetime: clonedAutomationInput.start_datetime,
          field_id: updatedFieldId ?? clonedAutomationInput.field_id,
          type: clonedAutomationInput.type,
        });

        if (!newAutomation) {
          throw new Error('Failed to create new automation');
        }
        resource = {
          id: newAutomation._id ?? '',
          name: newAutomation.name,
          type: ResourceType.AUTOMATION,
          data: new Automation({
            _id: newAutomation._id ?? '',
            name: newAutomation.name,
            type: newAutomation.type as AutomationType,
            board_id: newAutomation.board_id,
            workflow_id: newAutomation.workflow_id,
            organization_id: newAutomation.organization_id,
            description: newAutomation.description,
            trigger_frequency_unit:
              (newAutomation.trigger_frequency_unit as TriggerFrequencyUnitType) ??
              undefined,
            trigger_frequency_value: newAutomation.trigger_frequency_value,
            trigger_day_of_week: newAutomation.trigger_day_of_week,
            trigger_day_of_month: newAutomation.trigger_day_of_month,
            trigger_month_and_day: newAutomation.trigger_month_and_day,
            trigger_time: newAutomation.trigger_time,
            start_datetime: newAutomation.start_datetime,
            field_id: newAutomation.field_id,
          }),
        };
        break;
      }
      case ResourceType.AI_ASSISTANT: {
        const assistant = new AiAssistant(
          resource.data as unknown as IAiAssistantParameters,
        );
        const clonedAssistantInput = assistant.clone();
        if (
          clonedAssistantInput?.knowledge_hubs?.length > 0 ||
          clonedAssistantInput?.workflow_function_call?.length > 0 ||
          (clonedAssistantInput?.board_ids &&
            clonedAssistantInput?.board_ids?.length > 0) ||
          clonedAssistantInput?.guardrail_id ||
          (clonedAssistantInput?.sub_agents &&
            clonedAssistantInput?.sub_agents?.length > 0) ||
          (clonedAssistantInput?.document_ai?.schemas &&
            clonedAssistantInput?.document_ai?.schemas?.length > 0)
        ) {
          let newKnowledgeHubId: string | undefined;
          let newWorkflowFunctionCall: string[] | undefined;
          let newBoardIds: string[] | undefined;
          let newGuardRailId: string | undefined;
          let newSubAgents: string[] = [];
          let newDocumentAi: DocumentAI | undefined;
          if (clonedAssistantInput?.knowledge_hubs?.length > 0) {
            const [, clonedBoardId] =
              clonedAssistantInput.knowledge_hubs[0].split('//');
            newKnowledgeHubId = clonedBoardId;
          }
          if (
            clonedAssistantInput?.new_workflow_function_call &&
            clonedAssistantInput?.new_workflow_function_call?.length > 0
          ) {
            newWorkflowFunctionCall =
              clonedAssistantInput.new_workflow_function_call.map(
                (workflowId: string) => {
                  if (!workflowId) {
                    return '';
                  }
                  if (typeof workflowId === 'number') {
                    return '';
                  }
                  logger.info('workflowId split', { workflowId });
                  const [, clonedWorkflowId] = workflowId.split('//');
                  return clonedWorkflowId;
                },
              );
            newWorkflowFunctionCall = newWorkflowFunctionCall?.filter(
              (workflowId) => workflowId !== '',
            );
          }

          if (
            clonedAssistantInput?.board_ids &&
            clonedAssistantInput?.board_ids?.length > 0
          ) {
            newBoardIds = clonedAssistantInput.board_ids.map(
              (boardIdEntry: string) => {
                const [, clonedBoardId] = boardIdEntry.split('//');
                return clonedBoardId;
              },
            );
          }

          if (
            clonedAssistantInput?.sub_agents &&
            clonedAssistantInput?.sub_agents?.length > 0
          ) {
            newSubAgents = clonedAssistantInput.sub_agents.map(
              (subAgentEntry: string) => {
                const [, clonedAssistantId] = subAgentEntry.split('//');
                return clonedAssistantId;
              },
            );
          }

          // Document AI: for each schema, recreate the doc_schema (+ its 'schema'
          // category) and the board's 'databoard' category, then set the schema
          // refs on the assistant WITHOUT a board_id. The AI service provisions
          // the board itself (provision_document_ai_boards → databoard
          // _link-assistant) on the updateAssistant below — it sets from_schema_id,
          // derives fields from the schema attributes, applies the category, and
          // links agent_ids/databoard_ids. Marketplace must NOT call
          // _link-assistant here too, or every board gets provisioned twice.
          // Team access is dropped ([]) — team ids are org-scoped.
          if (
            clonedAssistantInput?.document_ai?.schemas &&
            clonedAssistantInput.document_ai.schemas.length > 0
          ) {
            const rebuiltSchemas: DocumentAISchema[] = [];

            for (const schema of clonedAssistantInput.document_ai.schemas) {
              const newBoardName =
                `${schema.data_board_name ?? schema._schema_data?.name ?? 'Document'} ${newID}`.trim();

              // doc_schema's own category (type 'schema').
              let newSchemaCategoryId: string | null = null;
              if (schema._schema_category_path?.length) {
                try {
                  newSchemaCategoryId = await ensureDocCategoryPath(
                    orgID,
                    schema._schema_category_path,
                    'schema',
                  );
                } catch (err) {
                  console.warn('install: failed to recreate schema category', err);
                }
              }

              // Board's category (type 'databoard') — passed through to the AI
              // service so its provisioning lands the board in the right place.
              let newBoardCategoryId: string | null = null;
              if (schema._board_category_path?.length) {
                try {
                  newBoardCategoryId = await ensureDocCategoryPath(
                    orgID,
                    schema._board_category_path,
                    'databoard',
                  );
                } catch (err) {
                  console.warn('install: failed to recreate board category', err);
                }
              }

              const schemaName =
                `${schema._schema_data?.name ?? schema.data_board_name ?? 'Schema'} ${newID}`.trim();

              let newSchemaId: string | undefined;
              try {
                // Reuse an existing doc_schema with the same name (the per-org
                // name is unique, so re-importing into an org that already has
                // it would otherwise 400). Only create when none exists.
                const existing = await findDocSchemaByName(orgID, schemaName);
                if (existing) {
                  newSchemaId = existing._id ?? existing.id;
                } else {
                  // Create the doc_schema record (attributes + own category). The
                  // board is provisioned later by the AI service from this schema.
                  const createdSchema = await createDocSchema(orgID, {
                    name: schemaName,
                    category: newSchemaCategoryId,
                    accessTeams: [],
                    attributes: schema._schema_data?.attributes ?? [],
                  });
                  newSchemaId = createdSchema?._id ?? createdSchema?.id;
                }
              } catch (err) {
                console.warn('install: failed to create/find doc schema', err);
              }

              // NOTE: no board_id — leaving it unset is what makes the AI
              // service provision a fresh board for this schema.
              rebuiltSchemas.push({
                schema_id: newSchemaId,
                data_board_name: newBoardName,
                // Only emit board_category_id when it's a real string — the AI
                // service rejects a null/non-string value (400, see open_webui
                // helper validate_assistant_input). Omitted → default category.
                ...(newBoardCategoryId
                  ? { board_category_id: newBoardCategoryId }
                  : {}),
                board_deployment_access: [],
              });
            }

            newDocumentAi = {
              ...clonedAssistantInput.document_ai,
              schemas: rebuiltSchemas,
            };
            // Drop any legacy top-level board_id from the source template — the
            // new model is schemas-only and a stale cross-org board_id would
            // otherwise linger on the imported agent.
            delete (newDocumentAi as any).board_id;
          }

          if (clonedAssistantInput?.guardrail_id) {
            const currentGuardRail = deps?.guardRails?.find(
              (gr: any) => gr.id === clonedAssistantInput.guardrail_id,
            );
            if (currentGuardRail) {
              const guardRailData = currentGuardRail as unknown as GuardRail;
              let guardRailName = guardRailData.name;
              if (guardRailName.length > 90) {
                guardRailName = guardRailName.substring(0, 90);
              }
              const newGuardRail = await createGuardRail(orgID, {
                name: guardRailName,
                description: guardRailData.description,
                instructions: guardRailData.instructions,
                model: guardRailData.model,
                unsafe_categories: guardRailData.unsafe_categories,
                competitor_keywords: guardRailData.competitor_keywords,
                custom_unsafe_patterns: guardRailData.custom_unsafe_patterns,
                org_id: orgID,
              });
              newGuardRailId = newGuardRail.id;
            }
          }

          // Only emit document_ai when the assistant already has one OR an
          // override sets a vlm field — preserves original behavior of
          // sending undefined for non-document_ai assistants.
          const baseDocumentAi =
            newDocumentAi ?? clonedAssistantInput.document_ai;
          const mergedDocumentAi =
            baseDocumentAi || overrides?.vlm_model || overrides?.vlm_provider_id
              ? {
                  ...(baseDocumentAi ?? {}),
                  ...(overrides?.vlm_model
                    ? { vlm_model: overrides.vlm_model }
                    : {}),
                  ...(overrides?.vlm_provider_id
                    ? { vlm_provider_id: overrides.vlm_provider_id }
                    : {}),
                }
              : undefined;

          const updatedAssistant = await updateAssistant(
            orgID,
            clonedAssistantInput.id,
            {
              name: clonedAssistantInput.name,
              model: clonedAssistantInput.model,
              instructions: clonedAssistantInput.instructions,
              model_id: overrides?.model_id ?? 'Default',
              ...(overrides?.provider_id
                ? { provider_id: overrides.provider_id }
                : {}),
              file_ids: [],
              metadata: clonedAssistantInput.metadata,
              mode: clonedAssistantInput.mode,
              channel: clonedAssistantInput.channel,
              category: clonedAssistantInput.category,
              personality_role: clonedAssistantInput.personality_role,
              core_task: clonedAssistantInput.core_task,
              tone_and_style: clonedAssistantInput.tone_and_style,
              response_length: clonedAssistantInput.response_length,
              banned_words: clonedAssistantInput.banned_words,
              workflow_name: `${clonedAssistantInput.mode} | ${clonedAssistantInput.name}`,
              created_at: clonedAssistantInput.created_at,
              description: clonedAssistantInput.description,
              knowledge_hubs: newKnowledgeHubId ? [newKnowledgeHubId] : [],
              workflow_function_call: newWorkflowFunctionCall ?? [],
              board_ids: newBoardIds ?? [],
              guardrail_id: newGuardRailId ?? '',
              agent_type: clonedAssistantInput.agent_type,
              streaming: clonedAssistantInput.streaming,
              sub_agents: newSubAgents,
              folder_ids: clonedAssistantInput?.folder_ids ?? [],
              default_folder_id: clonedAssistantInput?.default_folder_id ?? '',
              document_ai: mergedDocumentAi,
              vibe_code: clonedAssistantInput.vibe_code ?? false,
            },
          );

          if (!updatedAssistant) {
            throw new Error('Failed to create new assistant');
          }
        }

        if (
          clonedAssistantInput?.model === 'rag' &&
          clonedAssistantInput?.original_assistant_id
        ) {
          const isSuccess = await cloneAssistantFiles(
            orgID,
            clonedAssistantInput.id,
            clonedAssistantInput.original_assistant_id,
          );
          logger.info('cloned Assistant FileisSuccess', { isSuccess });
        }

        break;
      }
      case ResourceType.CHANNEL: {
        const channel = new Channel(
          resource.data as unknown as ChannelParameters,
        );
        const clonedChannelInput = channel.clone();
        // Channels without a workflow (e.g. plain web widgets exported from a
        // use-case template) carry workflow_id="" — no AP flow to re-link, so
        // skip the whole block. Otherwise getAPWorkflow(orgId, "") hits
        // `/v1/flows/`, which returns 409 and a body shape that breaks downstream.
        if (
          !clonedChannelInput.workflow_id ||
          !clonedChannelInput.workflow_id.toString().trim()
        ) {
          break;
        }
        const [oldOrgID, oldChannelWorkflowID] =
          clonedChannelInput.public_id.split('//');
        let oldChannelWorkflow;
        if (toIntOrUndefined(clonedChannelInput.workflow_id) === undefined) {
          const newChannelWorkflow = await getAPWorkflow(
            clonedChannelInput.organization_id,
            clonedChannelInput.workflow_id,
          );

          // Check if workflow exists in deps.channelWorkflow
          if (deps?.channelWorkflow && Array.isArray(deps.channelWorkflow)) {
            const workflowFromDeps = deps.channelWorkflow.find(
              (wf: any) => wf.workflow_id === oldChannelWorkflowID,
            );

            if (workflowFromDeps) {
              // Use the workflow data from deps
              oldChannelWorkflow = workflowFromDeps.data;
            } else {
              // Fallback to API call if not found in deps
              oldChannelWorkflow = await getAPWorkflow(
                oldOrgID,
                oldChannelWorkflowID,
              );
            }
          } else {
            // No deps provided, fetch from API
            oldChannelWorkflow = await getAPWorkflow(
              oldOrgID,
              oldChannelWorkflowID,
            );
          }

          if (!newChannelWorkflow || !oldChannelWorkflow) {
            throw new Error('Failed to get channel workflow');
          }

          const newChannelVersionData = newChannelWorkflow.version as any;

          const clonedAssistants = Array.from(clonedNodesMap.values()).filter(
            (resource) => resource.type === ResourceType.AI_ASSISTANT,
          );
          const originaAssistants =
            originalNodes.getNodesStartingWith('assistant-');

          const clonedDataboards = Array.from(clonedNodesMap.values()).filter(
            (resource) => resource.type === ResourceType.DATA_BOARD,
          );
          const originalDataboards =
            originalNodes.getNodesStartingWith('databoard-');

          let updatedNum = 0;
          let newVersionData = oldChannelWorkflow?.version;
          if (!newVersionData) {
            break;
          }
          if (newVersionData) {
            newVersionData.flowId = newChannelWorkflow.id;
          }

          if (newVersionData?.trigger?.nextAction) {
            const updateNextActionReferences = (action: any): any => {
              if (!action) return action;

              // Update boardId in settings.input
              if (
                action.settings?.input?.boardId &&
                clonedDataboards.length > 0 &&
                originalDataboards.length > 0
              ) {
                originalDataboards?.forEach((boardEntry: any) => {
                  const originalBoardData =
                    boardEntry.data as unknown as IDataBoardParameters;
                  const newBoard = clonedNodesMap.get(
                    `databoard-${originalBoardData.id}`,
                  );

                  if (newBoard) {
                    const newBoardData =
                      newBoard.data as unknown as IDataBoardParameters;

                    if (
                      action.settings.input.boardId === originalBoardData.id
                    ) {
                      action.settings.input.boardId = newBoardData.id;
                      updatedNum++;
                    }
                  }
                });
              }

              // Update assistant_id in settings.input
              if (
                action.settings?.input?.assistant_id &&
                clonedAssistants.length > 0 &&
                originaAssistants.length > 0
              ) {
                originaAssistants?.forEach((assistantEntry: any) => {
                  const originalAssistantData =
                    assistantEntry.data as unknown as IAiAssistantParameters;
                  const newAssistant = clonedNodesMap.get(
                    `assistant-${originalAssistantData.id}`,
                  );

                  if (newAssistant) {
                    const newAssistantData =
                      newAssistant.data as unknown as IAiAssistantParameters;

                    if (
                      action.settings.input.assistant_id ===
                      originalAssistantData.id
                    ) {
                      action.settings.input.assistant_id = newAssistantData.id;
                      updatedNum++;
                    }
                  }
                });
              }

              // Recursively update children array (for MULTIPLE_CHOICE type)
              if (action.children && Array.isArray(action.children)) {
                action.children = action.children.map((child: any) =>
                  updateNextActionReferences(child),
                );
              }

              // Recursively update nextAction
              if (action.nextAction) {
                action.nextAction = updateNextActionReferences(
                  action.nextAction,
                );
              }

              return action;
            };

            newVersionData.trigger.nextAction = updateNextActionReferences(
              newVersionData.trigger.nextAction,
            );

            // Replace board field IDs throughout the entire workflow version data
            if (
              originalDataboards &&
              originalDataboards.length > 0 &&
              clonedDataboards.length > 0
            ) {
              originalDataboards.forEach((originalBoard: any) => {
                const originalBoardData =
                  originalBoard.data as unknown as IDataBoardParameters;
                const newBoard = clonedNodesMap.get(
                  `databoard-${originalBoardData.id}`,
                );
                if (newBoard) {
                  const newBoardData =
                    newBoard.data as unknown as IDataBoardParameters;
                  if (
                    originalBoardData?.fields &&
                    newBoardData?.fields &&
                    originalBoardData?.fields?.length > 0 &&
                    newBoardData?.fields?.length > 0
                  ) {
                    originalBoardData.fields.forEach((field: any) => {
                      const fieldId = field._id;
                      const newField = newBoardData.fields.find(
                        (f: any) =>
                          f.name === field.name && f.type === field.type,
                      );
                      if (newField && newField?._id && fieldId) {
                        newVersionData = replaceValueInObject(
                          newVersionData,
                          fieldId,
                          newField._id,
                        );
                      }
                    });
                  }
                }
              });
            }

            await updateAPWorkflowTrigger(
              orgID,
              newChannelVersionData?.flowId ?? clonedChannelInput.workflow_id,
              newVersionData.trigger,
            );
            await publishAPWorkflow(
              orgID,
              clonedChannelInput.workflow_id,
              clonedChannelInput.name,
            );
          }
        } else {
          const newChannelWorkflow = await getWorkflow(
            clonedChannelInput.workflow_id,
            clonedChannelInput.organization_id,
          );
          let oldChannelWorkflow;

          if (deps?.channelWorkflow && Array.isArray(deps.channelWorkflow)) {
            const workflowFromDeps = deps.channelWorkflow.find(
              (wf: any) => wf.workflow_id === oldChannelWorkflowID,
            );

            if (workflowFromDeps) {
              // Use the workflow data from deps
              oldChannelWorkflow = workflowFromDeps.data;
            } else {
              // Fallback to API call if not found in deps
              oldChannelWorkflow = await getWorkflow(
                oldChannelWorkflowID,
                oldOrgID,
              );
            }
          } else {
            // No deps provided, fetch from API
            oldChannelWorkflow = await getWorkflow(
              oldChannelWorkflowID,
              oldOrgID,
            );
          }

          if (newChannelWorkflow && oldChannelWorkflow) {
            const clonedAssistants = Array.from(clonedNodesMap.values()).filter(
              (resource) => resource.type === ResourceType.AI_ASSISTANT,
            );
            const originaAssistants =
              originalNodes.getNodesStartingWith('assistant-');

            const clonedDataboards = Array.from(clonedNodesMap.values()).filter(
              (resource) => resource.type === ResourceType.DATA_BOARD,
            );
            const originalDataboards =
              originalNodes.getNodesStartingWith('databoard-');

            let newNodes = oldChannelWorkflow.nodes;
            const newWebhookId = getWebhookId(newChannelWorkflow.nodes);
            if (newWebhookId) {
              const oldWebhookId = getWebhookId(oldChannelWorkflow.nodes);
              newNodes = replaceValueInObject(
                newNodes,
                oldWebhookId,
                newWebhookId,
              );
            }
            if (
              originaAssistants &&
              originaAssistants.length > 0 &&
              clonedAssistants &&
              clonedAssistants.length > 0
            ) {
              originaAssistants.forEach((originalAssistant) => {
                const originalAssistantData =
                  originalAssistant.data as unknown as IAiAssistantParameters;
                const newAssistant = clonedNodesMap.get(
                  `assistant-${originalAssistantData.id}`,
                );
                if (newAssistant) {
                  const newAssistantData =
                    newAssistant.data as unknown as IAiAssistantParameters;
                  newNodes = replaceValueInObject(
                    newNodes,
                    originalAssistantData.id,
                    newAssistantData.id,
                  );
                  if (
                    originalAssistantData?.metadata &&
                    newAssistantData?.metadata &&
                    originalAssistantData?.metadata?.workflow_id &&
                    newAssistantData?.metadata?.workflow_id
                  ) {
                    newNodes = replaceValueInObject(
                      newNodes,
                      originalAssistantData.metadata.workflow_id,
                      newAssistantData.metadata.workflow_id,
                    );
                  }
                }
              });
            }

            if (
              originalDataboards &&
              originalDataboards.length > 0 &&
              clonedDataboards &&
              clonedDataboards.length > 0
            ) {
              originalDataboards.forEach((originalBoard) => {
                const originalBoardData =
                  originalBoard.data as unknown as IDataBoardParameters;
                const newBoard = clonedNodesMap.get(
                  `databoard-${originalBoardData.id}`,
                );
                if (newBoard) {
                  const newBoardData =
                    newBoard.data as unknown as IDataBoardParameters;
                  newNodes = replaceValueInObject(
                    newNodes,
                    originalBoardData.id,
                    newBoardData.id,
                  );
                  if (
                    originalBoardData?.fields &&
                    newBoardData?.fields &&
                    originalBoardData?.fields?.length > 0 &&
                    newBoardData?.fields?.length > 0
                  ) {
                    originalBoardData.fields.forEach((field: any) => {
                      const fieldId = field._id;
                      const newField = newBoardData.fields.find(
                        (f) => f.name === field.name && f.type === field.type,
                      );
                      if (newField && newField?.id && fieldId) {
                        newNodes = replaceValueInObject(
                          newNodes,
                          fieldId,
                          newField?._id ?? '',
                        );
                      }
                    });
                  }
                }
              });
            }

            const updatedChannelWorkflow = await updateWorkflow(
              {
                id: clonedChannelInput.workflow_id,
                name: newChannelWorkflow.name,
                tags: oldChannelWorkflow.tags,
                nodes: newNodes,
                connections: oldChannelWorkflow.connections,
                active: true,
                settings: oldChannelWorkflow.settings,
              },
              clonedChannelInput.organization_id,
            );

            if (!updatedChannelWorkflow) {
              throw new Error('Failed to create new channel');
            }
          }
        }
        break;
      }
      case ResourceType.USE_CASE: {
        const useCase = new UseCase(
          resource.data as unknown as IUseCaseParameters,
        );
        const clonedUseCaseInput = useCase.clone();
        logger.info('clonedUseCaseInput', clonedUseCaseInput);
        if (
          !clonedUseCaseInput.assistant_id ||
          !clonedUseCaseInput.channel_id
        ) {
          logger.warn('Missing assistant_id or channel_id in cloned use case');
          break;
        }
        const [origId, clonedAssistantId] =
          clonedUseCaseInput.assistant_id.split('//');
        logger.info('clonedAssistantId', { origId, clonedAssistantId });

        const [, clonedChannelId] = clonedUseCaseInput.channel_id.split('//');
        const newDemoUrl = replaceChannelIdInDemoUrl(
          clonedUseCaseInput.demo_url,
          clonedChannelId,
        );
        const updatedUseCase = await updateUseCase(clonedUseCaseInput.id, {
          ...clonedUseCaseInput,
          assistant_id: clonedAssistantId,
          demo_url: newDemoUrl,
          channel_id: clonedChannelId,
          updated_at: new Date(),
          type: 'custom',
        });
        if (!updatedUseCase) {
          throw new Error('Failed to update new use case');
        }

        break;
      }
      default:
        break;
    }

    // You can add additional cases for other resource types if needed.
    // For instance, if your Automation resource stores references, update them here.

    return resource;
  } catch (error) {
    logger.error('updateClonedResourceReferences Error: ', { error });
    throw handleServiceError(error);
  }
};

export const createTemplate = async (
  userContext: IUserContext,
  inputs: {
    id: string;
    type: string;
    name: string;
    description: string;
    active?: boolean;
  },
  isUpdateTemplate?: boolean,
  returnRawData?: boolean,
) => {
  try {
    logger.info('templateInput', inputs);
    let result: Coordinator | undefined;
    let isChannelWorkflowRequired = false;
    let finalDeps = {};
    let finalGraph = {};

    switch (inputs.type) {
      case ResourceType.DATA_BOARD:
        result = await createBoardTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.WORKFLOW:
        result = await createWorkflowTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.AI_ASSISTANT:
        result = await createAssistantTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.CHANNEL:
        isChannelWorkflowRequired = true;
        result = await createChannelTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.USE_CASE:
        isChannelWorkflowRequired = true;
        result = await createUseCaseTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.ORGANIZATION:
        result = await createOrgTemplate(userContext.org_id);
        break;
      default:
        throw new Error('Invalid type');
    }

    if (result) {
      logger.info('Graph structure:');
      printGraph(result, TEMPLATE_ORG_ID);

      // In your save method:

      const allNodes = Array.from(result['dag']['nodes'].values());
      // Do not filter the root; all nodes (including the root) are added to resources.
      const resources = allNodes;

      // In your save method:
      const graphData = {
        highestLevel: result.getHighestLevel(),
        resources,
        edges: Array.from(result['dag']['edges'].entries())
          .map(([parentId, children]) => {
            return Array.from(children).map((childId) => ({
              parentId,
              childId,
            }));
          })
          .flat(),
      };

      if (isUpdateTemplate) {
        return graphData;
      }
      let channelWorkflow: any = [];
      if (isChannelWorkflowRequired) {
        // Extract all channel resources from graphData and assert type to any[]
        const channelResources = (graphData.resources?.filter(
          (resource: any) => resource.type === ResourceType.CHANNEL,
        ) || []) as any[];

        // Process each channel and its workflow
        for (const channelResource of channelResources) {
          const channelData = (channelResource as any).data as any;
          const workflowId = channelData?.workflow_id;

          if (workflowId) {
            let workflowResource;
            let workflowName;

            // Check if workflow ID is numeric
            if (toIntOrUndefined(workflowId) !== undefined) {
              // Numeric workflow ID - use getWorkflow
              workflowResource = await getWorkflow(
                workflowId,
                userContext.org_id,
              );
              workflowName = workflowResource?.name;
            } else {
              // Non-numeric workflow ID - use getAPWorkflow
              workflowResource = await getAPWorkflow(
                userContext.org_id,
                workflowId,
              );
              workflowName =
                (workflowResource as any)?.version?.displayName ||
                workflowResource?.name;
            }

            if (workflowResource) {
              channelWorkflow.push({
                channel_id:
                  channelData?.id ||
                  (channelResource as any).id?.replace('channel-', ''),
                channel_name:
                  channelData?.name || (channelResource as any).name,
                workflow_id: workflowId,
                workflow_name: workflowName,
                data: workflowResource,
              });
            }
          }
        }
      }

      const guardRails = await getGuardRails(userContext.org_id);

      finalDeps = { channelWorkflow, guardRails };
      finalGraph = graphData;

      if (isUpdateTemplate && returnRawData) {
        return finalGraph;
      }

      if (returnRawData) {
        return {
          name: inputs.name,
          type: inputs.type,
          graph: finalGraph,
          description: inputs.description,
          organization_id: userContext.org_id,
          deps: finalDeps,
          active: inputs.active || false,
          public_id: uuid(),
        };
      }

      const templateRepo = TemplateRepositoryFactory.create();
      const template = await templateRepo.create({
        name: inputs.name,
        type: inputs.type,
        graph: finalGraph,
        description: inputs.description,
        organization_id: userContext.org_id,
        deps: finalDeps,
        active: inputs.active || false,
        public_id: uuid(),
      });

      return template;
    }
  } catch (error) {
    logger.info('createTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

export const createTemplateV3 = async (
  userContext: IUserContext,
  inputs: {
    id: string;
    type: string;
    name: string;
    description: string;
    active?: boolean;
  },
  isUpdateTemplate?: boolean,
) => {
  try {
    logger.info('createTemplateV3', inputs);
    let result: Coordinator | undefined;
    let isChannelWorkflowRequired = false;

    switch (inputs.type) {
      case ResourceType.DATA_BOARD:
        result = await createBoardTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.WORKFLOW:
        result = await createWorkflowTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.AI_ASSISTANT:
        result = await createAssistantTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.CHANNEL:
        isChannelWorkflowRequired = true;
        result = await createChannelTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.USE_CASE:
        isChannelWorkflowRequired = true;
        result = await createUseCaseTemplate(userContext.org_id, inputs.id);
        break;
      case ResourceType.ORGANIZATION:
        result = await createOrgTemplate(userContext.org_id);
        break;
      default:
        throw new Error('Invalid type');
    }

    if (result) {
      const allNodes = Array.from(result['dag']['nodes'].values());
      const resources = allNodes;

      const graphData = {
        highestLevel: result.getHighestLevel(),
        resources,
        edges: Array.from(result['dag']['edges'].entries())
          .map(([parentId, children]) => {
            return Array.from(children).map((childId) => ({
              parentId,
              childId,
            }));
          })
          .flat(),
      };

      if (isUpdateTemplate) {
        return graphData;
      }

      let channelWorkflow: any = [];
      if (isChannelWorkflowRequired) {
        const channelResources = (graphData.resources?.filter(
          (resource: any) => resource.type === ResourceType.CHANNEL,
        ) || []) as any[];

        for (const channelResource of channelResources) {
          const channelData = (channelResource as any).data as any;
          const workflowId = channelData?.workflow_id;

          if (workflowId) {
            let workflowResource;
            let workflowName;

            if (toIntOrUndefined(workflowId) !== undefined) {
              workflowResource = await getWorkflow(
                workflowId,
                userContext.org_id,
              );
              workflowName = workflowResource?.name;
            } else {
              workflowResource = await getAPWorkflow(
                userContext.org_id,
                workflowId,
              );
              workflowName =
                (workflowResource as any)?.version?.displayName ||
                workflowResource?.name;
            }

            if (workflowResource) {
              channelWorkflow.push({
                channel_id:
                  channelData?.id ||
                  (channelResource as any).id?.replace('channel-', ''),
                channel_name:
                  channelData?.name || (channelResource as any).name,
                workflow_id: workflowId,
                workflow_name: workflowName,
                data: workflowResource,
              });
            }
          }
        }
      }

      const guardRails = await getGuardRails(userContext.org_id);

      const finalDeps = { channelWorkflow, guardRails };
      const finalGraph = graphData;

      const templateData = {
        name: inputs.name,
        type: inputs.type,
        graph: finalGraph,
        description: inputs.description,
        organization_id: userContext.org_id,
        deps: finalDeps,
        active: inputs.active || false,
        public_id: uuid(),
      };

      return templateData;
    }
  } catch (error) {
    logger.info('createTemplateV3 Error: ', { error });
    throw handleServiceError(error);
  }
};

export const updateTemplateV3 = async (
  userContext: IUserContext,
  inputs: UpdateTemplateInputs,
) => {
  try {
    const updateData: any = {};
    if (inputs.name !== undefined) updateData.name = inputs.name;
    if (inputs.description !== undefined)
      updateData.description = inputs.description;
    if (inputs.active !== undefined) updateData.active = inputs.active;

    if (inputs.updateGraph) {
      const template = await findTemplateById(inputs.id);
      if (!template) {
        throw new Error('Template not found');
      }

      // Regenerate graph and deps using createTemplateV3 logic
      const fullRawData = await createTemplateV3(
        userContext,
        {
          id: template.original_id || template.id,
          type: template.type,
          name: template.name,
          description: template.description,
          active: template.active,
        },
        false,
      );

      if (fullRawData) {
        updateData.graph = (fullRawData as any).graph;
        updateData.deps = (fullRawData as any).deps;
        updateData.zip_s3_key = null;
      }
    }

    const repo = TemplateRepositoryFactory.create();
    return await repo.update(inputs.id, updateData);
  } catch (error) {
    logger.info('updateTemplateV3 Error: ', { error });
    throw handleServiceError(error);
  }
};

export const installTemplate = async (
  userContext: IUserContext,
  templateId: string | null,
  isDisabledNewId: boolean,
  isCloneBoardItems: boolean,
  templateData?: any,
  overrides?: AssistantInstallOverrides,
) => {
  try {
    let template: any;

    if (templateData) {
      // Use the provided template data directly
      template = templateData;
    } else {
      // Fetch template from database
      if (!templateId) {
        throw new Error(
          'Template ID is required when template data is not provided',
        );
      }

      const dbTemplate = await findTemplateById(templateId);
      if (!dbTemplate) {
        throw new Error('Template not found');
      }
      template = dbTemplate;
    }

    // Deserialize the template.graph into a Coordinator instance
    const templateGraph = template.graph;
    const coordinator = Coordinator.deserialize(templateGraph);

    // Some template formats (e.g. imbrace export) reference an assistant_id
    // from a use_case without including the AI_ASSISTANT as a graph resource.
    // Without it, cloneTemplate cannot create a new assistant in the user's
    // org and the installed use_case ends up pointing at the source org's
    // assistant. Synthesize the missing resources by fetching the assistant
    // from the source org (TEMPLATE_ORG_ID) and injecting it into the graph.
    await synthesizeMissingAssistantResources(
      coordinator,
      template?.organization_id || TEMPLATE_ORG_ID,
    );

    await cloneTemplate(
      userContext.org_id,
      coordinator,
      template?.deps ?? {},
      isDisabledNewId,
      isCloneBoardItems,
      overrides,
    );
    // printGraph(result, TEMPLATE_ORG_ID);
    return true;
  } catch (error) {
    logger.info('installTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

async function synthesizeMissingAssistantResources(
  coordinator: Coordinator,
  sourceOrgId: string,
): Promise<void> {
  const useCaseNodes = coordinator.getNodesStartingWith('usecase-');
  if (useCaseNodes.length === 0) return;

  // Collect referenced assistant ids that don't have a corresponding
  // ai_assistant resource in the graph.
  const referencedIds = new Set<string>();
  for (const uc of useCaseNodes) {
    const assistantId = (uc.data as any)?.assistant_id as string | undefined;
    if (!assistantId) continue;
    const candidates = [
      `assistant-${assistantId}`,
      `assistant-${assistantId.replace(/^assistant_/, '')}`,
    ];
    const present = candidates.some((key) => coordinator.findResource(key));
    if (!present) referencedIds.add(assistantId);
  }
  if (referencedIds.size === 0) return;

  const root = coordinator.getRoot();
  for (const assistantId of referencedIds) {
    try {
      const remote = await getAssistantById(sourceOrgId, assistantId);
      if (!remote) {
        logger.warn(
          `synthesizeMissingAssistantResources: assistant ${assistantId} not found in ${sourceOrgId}`,
        );
        continue;
      }
      const data = new AiAssistant({
        id: remote.id ?? assistantId,
        name: remote.name,
        model: remote.model,
        instructions: remote.instructions,
        file_ids: remote.file_ids ?? [],
        metadata: remote.metadata,
        mode: remote.mode,
        channel: remote.channel,
        category: remote.category,
        personality_role: remote.personality_role,
        core_task: remote.core_task,
        tone_and_style: remote.tone_and_style,
        response_length: remote.response_length,
        banned_words: remote.banned_words,
        workflow_name: '',
        created_at: remote.created_at,
        description: remote.description,
        knowledge_hubs: remote.knowledge_hubs ?? [],
        workflow_function_call: remote.workflow_function_call ?? [],
        version: remote.version || 1,
        agent_type: remote.agent_type,
        streaming: remote.streaming,
        folder_ids: remote.folder_ids ?? [],
        guardrail_id: remote.guardrail_id,
        board_ids: remote.board_ids ?? [],
        default_folder_id: remote.default_folder_id,
        sub_agents: remote.sub_agents ?? [],
        folders: (remote as any).folders ?? [],
        document_ai: (remote as any).document_ai,
      });
      const resource: IResource = {
        id: `assistant-${assistantId}`,
        name: remote.name ?? assistantId,
        type: ResourceType.AI_ASSISTANT,
        data,
      };
      coordinator.addResource(resource);
      coordinator.addEdge(root.id, resource.id);
    } catch (err: any) {
      logger.warn(
        `synthesizeMissingAssistantResources: failed to fetch ${assistantId}`,
        err?.message,
      );
    }
  }
}

export const updateTemplate = async (inputs: UpdateTemplateInputs) => {
  try {
    const updateData: Partial<UpdateTemplateInputs> = {};
    if (inputs.name !== undefined) updateData.name = inputs.name;
    if (inputs.description !== undefined)
      updateData.description = inputs.description;
    if (inputs.active !== undefined) updateData.active = inputs.active;

    if (inputs.updateGraph) {
      const template = await findTemplateById(inputs.id);
      if (!template) {
        throw new Error('Template not found');
      }

      const newGraphData = await createTemplate(
        {
          org_id: (template as any).organization_id || TEMPLATE_ORG_ID,
          business_unit_id: '',
        },
        {
          id: (template as any).original_id || template.id,
          type: template.type,
          name: template.name,
          description: template.description,
          active: template.active,
        },
        true,
      );
      updateData.graph = newGraphData;
    }

    const repo = TemplateRepositoryFactory.create();
    return await repo.update(inputs.id, updateData);
  } catch (error) {
    logger.info('updateTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

const createBoardTemplate = async (
  orgID: string,
  id: string,
): Promise<Coordinator> => {
  try {
    const boards = await getBoards(orgID);
    const selectedBoard = boards.find((board) => board.id === id);
    if (!selectedBoard) {
      throw new Error('Board not found');
    }
    // Fetch CSV data for the selected board (tolerate upstream failure)
    let csvData: any = null;
    try {
      csvData = await exportCSV(orgID, id);
    } catch (csvErr) {
      logger.warn(
        `Failed to export CSV for board ${id}; continuing without csvData`,
        csvErr,
      );
    }
    const automations = await getAutomationByOrgIdV2(orgID);
    const boardAutomations = automations.filter(
      (automation) => automation.board_id === id,
    );
    const automationWorkflows = boardAutomations.map(
      (automation) => automation.workflow_id,
    );
    const assistantWorkflows = await getWorkflowsRelatedToAssistant(orgID);
    const assistants = await getAssistants(orgID);
    const workflows = await getAPWorkflowResources(orgID, assistantWorkflows);

    // Filter assistants by databoards
    const filteredAssistants = assistants.filter(
      (assistant) =>
        assistant?.knowledge_hubs && assistant.knowledge_hubs?.includes(id),
    );

    // Filter workflows by automationWorkflows and assistants
    const filteredWorkflows = workflows.filter(
      (workflow) =>
        workflow.id &&
        (automationWorkflows.includes(workflow.id?.toString()) ||
          filteredAssistants.some((assistant) =>
            assistant.workflow_function_call?.includes(workflow.id ?? ''),
          )),
    );

    const filteredBoards = boards
      .map((board) =>
        board.id === id
          ? { ...board, csvData: csvData }
          : filteredWorkflows.some((workflow) =>
                workflow?.boardIds?.includes(board.id),
              ) ||
              filteredAssistants.some((assistant) =>
                assistant?.knowledge_hubs?.includes(board.id),
              )
            ? board
            : null,
      )
      .filter(Boolean);

    // Filter automations by filtered boards and workflows
    const filteredAutomations = automations.filter(
      (automation) =>
        filteredBoards.some(
          (board) => board && board.id === automation.board_id,
        ) &&
        workflows.some(
          (workflow) =>
            workflow.id && workflow.id?.toString() === automation.workflow_id,
        ),
    );

    const filterAutomationWorkflows = workflows.filter(
      (workflow) =>
        filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAutomations.some(
          (automation) => automation.workflow_id === workflow.id?.toString(),
        ),
    );

    const enrichedBoards = await enrichTableInTableFields(
      orgID,
      filteredBoards as BoardSchema[],
    );

    const templateData = {
      organization: {
        id: TEMPLATE_ORG_ID,
        name: TEMPLATE_ORG_ID,
        databoards: enrichedBoards,
        automations: filteredAutomations,
        assistants: filteredAssistants,
        workflows: [...filteredWorkflows, ...filterAutomationWorkflows],
        channels: [],
        journeys: [],
      },
    };

    const coordinator = buildGraph(templateData);
    return coordinator;
  } catch (error) {
    logger.info('createBoardTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

const createWorkflowTemplate = async (
  orgID: string,
  id: string,
): Promise<Coordinator> => {
  try {
    const assistantWorkflows = await getWorkflowsRelatedToAssistant(orgID);
    const workflows = await getWorkflowResources(orgID, [], assistantWorkflows);
    const selectedWorkflow = workflows?.find(
      (workflow) => workflow.id?.toString() === id,
    );
    if (!selectedWorkflow) {
      throw new Error('Workflow not found');
    }
    const assistants = await getAssistants(orgID);
    const boards = await getBoards(orgID);
    let automations: any[] = [];
    try {
      automations = await getAutomationByOrgId(orgID);
    } catch (error) {
      logger.warn('Failed to fetch automations from platform service:', error);
    }

    // Filter assistants by databoards
    const filteredAssistants = assistants.filter(
      (assistant) =>
        selectedWorkflow?.assistantIds?.some(
          (wf) => wf.assistantId === assistant.id,
        ) ||
        (assistant?.workflow_function_call &&
          assistant.workflow_function_call?.includes(id)),
    );

    // Filter workflows by assistants and assistantWorkflowIds
    const filteredWorkflows = workflows.filter(
      (workflow) =>
        workflow.id &&
        workflow?.tags?.some(
          (tag) =>
            tag.name !== 'preset' &&
            tag.name !== 'web' &&
            tag.name !== 'whatsapp',
        ) &&
        (workflow.id?.toString() === id ||
          filteredAssistants.some((assistant) =>
            assistant.workflow_function_call?.includes(workflow.id ?? ''),
          )),
    );

    // Filter databoard by workflow and assistants
    const filteredBoards = boards.filter(
      (board) =>
        filteredWorkflows.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ) ||
        filteredAssistants.some(
          (assistant) =>
            assistant?.knowledge_hubs &&
            assistant.knowledge_hubs?.includes(board.id),
        ),
    );

    // Filter automations by databoard and workflow
    const filteredAutomations = automations.filter(
      (automation) =>
        filteredBoards.some(
          (board) => board.id && board.id === automation.board_id,
        ) &&
        workflows.some(
          (workflow) =>
            workflow.id && workflow.id?.toString() === automation.workflow_id,
        ),
    );

    const filterAutomationWorkflows = workflows.filter(
      (workflow) =>
        filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAutomations.some(
          (automation) => automation.workflow_id === workflow.id?.toString(),
        ),
    );

    // Enrich TableInTable fields with child board fields
    const enrichedBoards = await enrichTableInTableFields(
      orgID,
      filteredBoards,
    );

    // Add CSV data to each filtered board
    const filteredBoardsWithCsv = await Promise.all(
      enrichedBoards.map(async (board) => {
        let csvData: any = null;
        try {
          csvData = await exportCSV(orgID, board.id);
        } catch (csvErr) {
          logger.warn(
            `Failed to export CSV for board ${board.id}; continuing without csvData`,
            csvErr,
          );
        }
        return {
          ...board,
          csvData: csvData,
        };
      }),
    );

    const templateData = {
      organization: {
        id: TEMPLATE_ORG_ID,
        name: TEMPLATE_ORG_ID,
        databoards: filteredBoardsWithCsv,
        automations: filteredAutomations,
        assistants: filteredAssistants,
        workflows: [...filteredWorkflows, ...filterAutomationWorkflows],
        channels: [],
        journeys: [],
      },
    };

    const coordinator = buildGraph(templateData);
    return coordinator;
  } catch (error) {
    logger.info('createBoardTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

const createAssistantTemplate = async (
  orgID: string,
  id: string,
): Promise<Coordinator> => {
  try {
    const assistants = await getAssistants(orgID);
    const selectedAssistant = assistants.find(
      (assistant) => assistant.id === id,
    );
    if (!selectedAssistant) {
      throw new Error('Assistant not found');
    }

    const assistantWorkflows = await getWorkflowsRelatedToAssistant(orgID);
    const workflows = await getWorkflowResources(orgID, [], assistantWorkflows);

    const boards = await getBoards(orgID);
    let automations: any[] = [];
    try {
      automations = await getAutomationByOrgId(orgID);
    } catch (error) {
      logger.warn('Failed to fetch automations from platform service:', error);
    }

    // Filter workflows by selected assistant
    const filteredWorkflows = workflows.filter(
      (workflow) =>
        workflow.id &&
        workflow?.tags?.some(
          (tag) =>
            tag.name !== 'preset' &&
            tag.name !== 'web' &&
            tag.name !== 'whatsapp',
        ) &&
        selectedAssistant.workflow_function_call?.includes(workflow.id ?? ''),
    );

    // Filter assistant by filtered Workflows
    const filteredAssistants = assistants.filter(
      (assistant) =>
        assistant.id !== id &&
        filteredWorkflows.some(
          (workflow) =>
            workflow?.assistantIds &&
            workflow?.assistantIds?.some(
              (wf) => wf.assistantId === assistant.id,
            ),
        ),
    );

    const filteredAssistantWorkflows = workflows.filter(
      (workflow) =>
        filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAssistants.some((assistant) =>
          assistant.workflow_function_call?.includes(workflow.id ?? ''),
        ),
    );

    // Filter board by assistants and workflows
    const filteredBoards = boards.filter(
      (board) =>
        (selectedAssistant?.knowledge_hubs &&
          selectedAssistant.knowledge_hubs?.includes(board.id)) ||
        filteredAssistants.some(
          (assistant) =>
            assistant?.knowledge_hubs &&
            assistant.knowledge_hubs?.includes(board.id),
        ) ||
        filteredWorkflows.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ) ||
        filteredAssistantWorkflows.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ),
      // Document AI schema boards are provisioned from the doc_schema on import
      // (see _link-assistant), so they are not cloned as databoards here.
    );

    // Filter automations by databoard and workflow
    const filteredAutomations = automations.filter(
      (automation) =>
        filteredBoards.some(
          (board) => board.id && board.id === automation.board_id,
        ) &&
        workflows.some(
          (workflow) =>
            workflow.id && workflow.id?.toString() === automation.workflow_id,
        ),
    );

    const filterAutomationWorkflows = workflows.filter(
      (workflow) =>
        filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAssistantWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAutomations.some(
          (automation) => automation.workflow_id === workflow.id?.toString(),
        ),
    );

    // Enrich TableInTable fields with child board fields
    const enrichedBoards = await enrichTableInTableFields(
      orgID,
      filteredBoards,
    );

    // Add CSV data to each filtered board
    const filteredBoardsWithCsv = await Promise.all(
      enrichedBoards.map(async (board) => {
        let csvData: any = null;
        try {
          csvData = await exportCSV(orgID, board.id);
        } catch (csvErr) {
          logger.warn(
            `Failed to export CSV for board ${board.id}; continuing without csvData`,
            csvErr,
          );
        }
        return {
          ...board,
          csvData: csvData,
        };
      }),
    );

    const assistantsForTemplate = [selectedAssistant, ...filteredAssistants];

    // Capture Document AI schema definitions + categories for recreation.
    await enrichDocumentAiSchemas(orgID, assistantsForTemplate);

    const templateData = {
      organization: {
        id: TEMPLATE_ORG_ID,
        name: TEMPLATE_ORG_ID,
        databoards: filteredBoardsWithCsv,
        automations: filteredAutomations,
        assistants: assistantsForTemplate,
        workflows: [
          ...filteredWorkflows,
          ...filteredAssistantWorkflows,
          ...filterAutomationWorkflows,
        ],
        channels: [],
        journeys: [],
      },
    };

    const coordinator = buildGraph(templateData);
    return coordinator;
  } catch (error) {
    logger.info('createAssistantTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

const createChannelTemplate = async (
  orgID: string,
  id: string,
): Promise<Coordinator> => {
  try {
    logger.info('inputs', orgID, id);
    const channel = await fetchChannelOrFail(orgID, id);

    if ((channel.type ?? channel.config.type) !== 'web') {
      throw new Error('Only web channels are supported');
    }

    const assistants = await getAssistants(orgID);
    const assistantWorkflows = await getWorkflowsRelatedToAssistant(orgID);
    const workflows = await getWorkflowResources(orgID, [], assistantWorkflows);

    const boards = await getBoards(orgID);
    let automations: any[] = [];
    try {
      automations = await getAutomationByOrgId(orgID);
    } catch (error) {
      logger.warn('Failed to fetch automations from platform service:', error);
    }

    const channelWorkflow = workflows.find(
      (workflow) => workflow.id?.toString() === channel.workflow_id,
    );

    const filteredChannelAssistants = assistants.filter(
      (assistant) =>
        channelWorkflow?.assistantIds &&
        channelWorkflow.assistantIds?.some(
          (wf) => wf.assistantId === assistant.id,
        ),
    );

    const filteredWorkflows = workflows.filter(
      (workflow) =>
        workflow.id &&
        workflow?.tags?.some(
          (tag) =>
            tag.name !== 'preset' &&
            tag.name !== 'web' &&
            tag.name !== 'whatsapp',
        ) &&
        workflow.id?.toString() !== channel.workflow_id &&
        filteredChannelAssistants.some((assistant) =>
          assistant.workflow_function_call?.includes(workflow.id ?? ''),
        ),
    );

    const filteredWorkflowAssistants = assistants.filter(
      (assistant) =>
        filteredChannelAssistants.every((as) => as.id !== assistant.id) &&
        filteredWorkflows.some(
          (workflow) =>
            workflow?.assistantIds &&
            workflow?.assistantIds?.some(
              (wf) => wf.assistantId === assistant.id,
            ),
        ),
    );

    const filteredBoards = boards.filter(
      (board) =>
        filteredChannelAssistants.some(
          (assistant) =>
            assistant?.knowledge_hubs &&
            assistant.knowledge_hubs?.includes(board.id),
        ) ||
        filteredWorkflows.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ) ||
        channelWorkflow?.boardIds?.includes(board.id) ||
        filteredWorkflowAssistants.some(
          (assistant) =>
            assistant?.knowledge_hubs &&
            assistant.knowledge_hubs?.includes(board.id),
        ),
    );

    // Filter automations by databoard and workflow
    const filteredAutomations = automations.filter(
      (automation) =>
        filteredBoards.some(
          (board) => board.id && board.id === automation.board_id,
        ) &&
        workflows.some(
          (workflow) =>
            workflow.id && workflow.id?.toString() === automation.workflow_id,
        ),
    );

    const filterAutomationWorkflows = workflows.filter(
      (workflow) =>
        filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAutomations.some(
          (automation) => automation.workflow_id === workflow.id?.toString(),
        ),
    );

    // Enrich TableInTable fields with child board fields
    const enrichedBoards = await enrichTableInTableFields(
      orgID,
      filteredBoards,
    );

    // Add CSV data to each filtered board
    const filteredBoardsWithCsv = await Promise.all(
      enrichedBoards.map(async (board) => {
        let csvData: any = null;
        try {
          csvData = await exportCSV(orgID, board.id);
        } catch (csvErr) {
          logger.warn(
            `Failed to export CSV for board ${board.id}; continuing without csvData`,
            csvErr,
          );
        }
        return {
          ...board,
          csvData: csvData,
        };
      }),
    );

    const templateData = {
      organization: {
        id: TEMPLATE_ORG_ID,
        name: TEMPLATE_ORG_ID,
        databoards: filteredBoardsWithCsv,
        automations: filteredAutomations,
        assistants: [
          ...filteredChannelAssistants,
          ...filteredWorkflowAssistants,
        ],
        workflows: [...filteredWorkflows, ...filterAutomationWorkflows],
        channels: [channel],
        journeys: [],
      },
    };

    const coordinator = buildGraph(templateData);
    return coordinator;
  } catch (error) {
    logger.info('createChannelTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

const createUseCaseTemplate = async (
  orgID: string,
  id: string,
): Promise<Coordinator> => {
  return createUseCaseTemplateV2(orgID, id);
};

const createUseCaseTemplateV2 = async (
  orgID: string,
  id: string,
): Promise<Coordinator> => {
  try {
    const useCaseRepo = UseCaseRepositoryFactory.create();
    const useCase = await useCaseRepo.findById(id);

    if (!useCase) {
      throw new Error('Use case not found');
    }

    if (!useCase?.assistant_id) {
      throw new Error('Use case is missing ai assistant');
    }

    let channel_id = useCase?.channel_id;

    if (!channel_id) {
      if (!useCase?.template_id) {
        throw new Error('Use case is missing template');
      }

      const templateRepo = TemplateRepositoryFactory.create();
      const template = await templateRepo.findById(useCase.template_id);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.type !== ResourceType.CHANNEL) {
        throw new Error('Only channel templates are supported for use case');
      }

      channel_id = template.original_id;
    }

    const cloneUseCase = new UseCase({
      id: useCase.id,
      title: useCase.title,
      version: 2,
      short_description: useCase?.short_description ?? '',
      description: useCase?.description ?? '',
      features: useCase?.features ?? [],
      thumbnail_url: useCase?.thumbnail_url ?? '',
      hover_thumbnail_url: useCase?.hover_thumbnail_url ?? '',
      media: useCase?.media ?? [],
      organization_id: orgID,
      tags: useCase?.tags ?? [],
      video_url: useCase?.video_url ?? '',
      demo_url: useCase?.demo_url ?? '',
      demo_image_url: useCase?.demo_image_url ?? '',
      how_it_works: useCase?.how_it_works ?? [],
      suggestion_prompts: useCase.suggestion_prompts ?? [],
      supported_channels:
        useCase.supported_channels?.map((item) => ({
          icon: item.icon ?? '',
          title: item.title ?? '',
        })) ?? [],
      integrations:
        useCase.integrations?.map((integration) => ({
          title: integration.title ?? '',
          icon: integration.icon ?? '',
        })) ?? [],
      template_id: '',
      assistant_id: useCase.assistant_id ?? '',
      channel_id: channel_id ?? '',
      user_id: useCase.user_id ?? '',
      agent_type: useCase?.agent_type ?? 'agent',
    });

    let channel: any = null;
    try {
      channel = await getChannelById(orgID, channel_id);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        logger.warn(
          `Channel ${channel_id} not found in channel-service; continuing without channel metadata`,
        );
      } else {
        throw err;
      }
    }
    if (channel && (channel.type ?? channel.config.type) !== 'web') {
      throw new Error('Only web channels are supported');
    }

    const assistants = await getAssistants(orgID);
    const assistantWorkflows = await getWorkflowsRelatedToAssistant(orgID);
    const workflows = await getAPWorkflowResources(orgID, assistantWorkflows);
    const clonedUsecaseAssistant = assistants.find(
      (assistant) => assistant.id === useCase.assistant_id,
    );

    const boards = await getBoards(orgID);
    let automations: any[] = [];
    try {
      automations = await getAutomationByOrgIdV2(orgID);
    } catch (error) {
      // Platform service may be unavailable, continue with empty automations
      logger.warn('Failed to fetch automations from platform service:', error);
    }
    const allFolders = await getFolders(orgID);

    let channelWorkflow: IAPWorkflowParameters | undefined;
    let filteredChannelAssistants: AIAssistant[] = [];

    if (channel) {
      channelWorkflow = workflows.find(
        (workflow) => workflow.id?.toString() === channel.workflow_id,
      );
      if (channelWorkflow) {
        filteredChannelAssistants = assistants.filter(
          (assistant) =>
            channelWorkflow?.assistantIds &&
            channelWorkflow.assistantIds?.some(
              (wf) => wf.assistantId === assistant.id,
            ),
        );
      }
    }

    const filteredWorkflows = workflows.filter(
      (workflow) =>
        workflow.id &&
        workflow.id?.toString() !== channel.workflow_id &&
        (filteredChannelAssistants.some((assistant) =>
          assistant.workflow_function_call?.includes(workflow.id ?? ''),
        ) ||
          // Fallback: include workflows referenced by the use case's own assistant.
          // Needed when channel.workflow_id is missing/undefined — without this, no
          // filteredChannelAssistants are computed and the lead assistant's tool
          // workflows are silently dropped from the template.
          clonedUsecaseAssistant?.workflow_function_call?.includes(
            workflow.id ?? '',
          )),
    );

    const filteredWorkflowAssistants = assistants.filter(
      (assistant) =>
        filteredChannelAssistants.every((as) => as.id !== assistant.id) &&
        filteredWorkflows.some(
          (workflow) =>
            workflow?.assistantIds &&
            workflow?.assistantIds?.some(
              (wf) => wf.assistantId === assistant.id,
            ),
        ),
    );

    const useCaseAssistant = filteredWorkflowAssistants.find(
      (assistant) => assistant.id === useCase.assistant_id,
    );
    if (
      !useCaseAssistant &&
      clonedUsecaseAssistant &&
      !filteredChannelAssistants.find(
        (assistant) => assistant.id === useCase.assistant_id,
      )
    ) {
      filteredWorkflowAssistants.push(clonedUsecaseAssistant);
    }

    const sub_usecases = [];
    let subAgentWorkflows: IAPWorkflowParameters[] = [];
    let subAgentChannels: Awaited<ReturnType<typeof getChannelById>>[] = [];
    if (
      clonedUsecaseAssistant &&
      clonedUsecaseAssistant.sub_agents &&
      clonedUsecaseAssistant.sub_agents.length > 0
    ) {
      const subAgentAssistants = assistants.filter(
        (assistant) =>
          assistant.id &&
          clonedUsecaseAssistant.sub_agents?.includes(assistant.id) &&
          filteredWorkflowAssistants.every((as) => as.id !== assistant.id) &&
          filteredChannelAssistants.every((as) => as.id !== assistant.id),
      );
      filteredWorkflowAssistants.push(...subAgentAssistants);

      // Collect workflows referenced by sub-agent assistants
      subAgentWorkflows = workflows.filter(
        (workflow) =>
          workflow.id &&
          workflow.id?.toString() !== channel.workflow_id &&
          filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
          subAgentAssistants.some((assistant) =>
            assistant.workflow_function_call?.includes(workflow.id ?? ''),
          ),
      );

      if (cloneUseCase.agent_type === 'team_lead') {
        const subRepo = UseCaseRepositoryFactory.create();
        const sub_useCaseData = await subRepo.findByAssistantIds(
          clonedUsecaseAssistant.sub_agents ?? [],
        );

        if (sub_useCaseData && sub_useCaseData.length > 0) {
          sub_usecases.push(
            ...sub_useCaseData.map(
              (usecase) =>
                new UseCase({
                  id: usecase.id,
                  title: usecase.title,
                  version: 2,
                  short_description: usecase?.short_description ?? '',
                  description: usecase?.description ?? '',
                  features: usecase?.features ?? [],
                  thumbnail_url: usecase?.thumbnail_url ?? '',
                  hover_thumbnail_url: usecase?.hover_thumbnail_url ?? '',
                  media: usecase?.media ?? [],
                  organization_id: orgID,
                  tags: usecase?.tags ?? [],
                  video_url: usecase?.video_url ?? '',
                  demo_url: usecase?.demo_url ?? '',
                  demo_image_url: usecase?.demo_image_url ?? '',
                  how_it_works: usecase?.how_it_works ?? [],
                  suggestion_prompts: usecase.suggestion_prompts ?? [],
                  supported_channels:
                    usecase.supported_channels?.map((item) => ({
                      icon: item.icon ?? '',
                      title: item.title ?? '',
                    })) ?? [],
                  integrations:
                    usecase.integrations?.map((integration) => ({
                      title: integration.title ?? '',
                      icon: integration.icon ?? '',
                    })) ?? [],
                  template_id: '',
                  assistant_id: usecase.assistant_id ?? '',
                  channel_id: usecase.channel_id ?? channel_id ?? '',
                  user_id: usecase.user_id ?? '',
                  agent_type: usecase?.agent_type ?? 'agent',
                }),
            ),
          );
        }

        // Fetch distinct sub-agent channels
        const subChannelIds = [
          ...new Set(
            sub_useCaseData
              .map((uc) => uc.channel_id)
              .filter((cid): cid is string => !!cid && cid !== channel_id),
          ),
        ];
        const subChannelResults = await Promise.all(
          subChannelIds.map((cid) =>
            getChannelById(orgID, cid).catch(() => null),
          ),
        );
        subAgentChannels = subChannelResults.filter(
          (ch): ch is NonNullable<typeof ch> => ch !== null,
        );
      }
    }

    const filteredBoards = boards.filter(
      (board) =>
        filteredChannelAssistants.some(
          (assistant) =>
            (assistant?.knowledge_hubs &&
              assistant.knowledge_hubs?.includes(board.id)) ||
            assistant.board_ids?.includes(board.id),
        ) ||
        filteredWorkflows.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ) ||
        channelWorkflow?.boardIds?.includes(board.id) ||
        filteredWorkflowAssistants.some(
          (assistant) =>
            (assistant?.knowledge_hubs &&
              assistant.knowledge_hubs?.includes(board.id)) ||
            assistant.board_ids?.includes(board.id),
        ) ||
        subAgentWorkflows.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ),
      // NOTE: Document AI schema boards are intentionally NOT cloned here — on
      // import they are provisioned fresh from the doc_schema (with from_schema_id
      // + fields derived from the schema attributes) via _link-assistant.
    );

    // Filter automations by databoard and workflow
    const filteredAutomations = automations.filter(
      (automation) =>
        filteredBoards.some(
          (board) => board.id && board.id === automation.board_id,
        ) &&
        workflows.some(
          (workflow) =>
            workflow.id && workflow.id?.toString() === automation.workflow_id,
        ),
    );

    const filterAutomationWorkflows = workflows.filter(
      (workflow) =>
        filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAutomations.some(
          (automation) => automation.workflow_id === workflow.id?.toString(),
        ),
    );

    // Enrich TableInTable fields with child board fields
    const enrichedBoards = await enrichTableInTableFields(
      orgID,
      filteredBoards,
    );

    // Add CSV data to each filtered board
    const filteredBoardsWithCsv = await Promise.all(
      enrichedBoards.map(async (board) => {
        let csvData: any = null;
        try {
          csvData = await exportCSV(orgID, board.id);
        } catch (csvErr) {
          logger.warn(
            `Failed to export CSV for board ${board.id}; continuing without csvData`,
            csvErr,
          );
        }
        return {
          ...board,
          csvData: csvData,
        };
      }),
    );

    // Attach folder data to each assistant based on their folder_ids
    const allAssistants = [
      ...filteredChannelAssistants,
      ...filteredWorkflowAssistants,
    ];
    const foldersByAssistant = new Map<string, IKnowledgeHubFolder[]>();
    for (const assistant of allAssistants) {
      if (assistant.folder_ids?.length) {
        foldersByAssistant.set(
          assistant.id!,
          allFolders.filter((f) => assistant.folder_ids!.includes(f._id)),
        );
      }
    }
    const assistantsWithFolders = allAssistants.map((a) => ({
      ...a,
      provider_id: 'system',
      model: 'default',
      folders: foldersByAssistant.get(a.id!) ?? [],
    }));

    // Document AI: capture each schema's doc_schema (attributes) + category
    // ancestor path so import can recreate the doc_schema record + category in
    // the target org. Best-effort — a fetch failure leaves the schema ref as-is.
    await enrichDocumentAiSchemas(orgID, assistantsWithFolders);

    const templateData = {
      organization: {
        id: TEMPLATE_ORG_ID,
        name: TEMPLATE_ORG_ID,
        databoards: filteredBoardsWithCsv,
        automations: filteredAutomations,
        assistants: assistantsWithFolders,
        workflows: [
          ...filteredWorkflows,
          ...filterAutomationWorkflows,
          ...subAgentWorkflows.filter((wf) =>
            filterAutomationWorkflows.every((aw) => aw.id !== wf.id),
          ),
        ],
        channels: channel
          ? [channel, ...subAgentChannels]
          : [...subAgentChannels],
        useCases: [cloneUseCase, ...sub_usecases],
        journeys: [],
      },
    };

    const coordinator = buildGraph(templateData);
    return coordinator;
  } catch (error) {
    logger.info('createUseCaseTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

const createOrgTemplate = async (orgID: string): Promise<Coordinator> => {
  try {
    const channels = await getChannels(orgID, 'web');

    const assistants = await getAssistants(orgID);
    const assistantWorkflows = await getWorkflowsRelatedToAssistant(orgID);
    const workflows = await getWorkflowResources(orgID, [], assistantWorkflows);

    const boards = await getBoards(orgID);
    let automations: any[] = [];
    try {
      automations = await getAutomationByOrgId(orgID);
    } catch (error) {
      logger.warn('Failed to fetch automations from platform service:', error);
    }

    const channelWorkflows = workflows.filter((workflow) =>
      channels.some(
        (channel) => workflow.id?.toString() === channel.workflow_id,
      ),
    );

    const filteredChannelAssistants = assistants;

    const filteredWorkflows = workflows.filter(
      (workflow) =>
        workflow.id &&
        workflow?.tags?.some(
          (tag) =>
            tag.name !== 'preset' &&
            tag.name !== 'web' &&
            tag.name !== 'whatsapp',
        ) &&
        channels.every(
          (channel) => workflow.id?.toString() !== channel.workflow_id,
        ),
    );

    const filteredWorkflowAssistants = assistants.filter(
      (assistant) =>
        filteredChannelAssistants.every((as) => as.id !== assistant.id) &&
        filteredWorkflows.some(
          (workflow) =>
            workflow?.assistantIds &&
            workflow?.assistantIds?.some(
              (wf) => wf.assistantId === assistant.id,
            ),
        ),
    );

    const filteredBoards = boards.filter(
      (board) =>
        filteredChannelAssistants.some(
          (assistant) =>
            assistant?.knowledge_hubs &&
            assistant.knowledge_hubs?.includes(board.id),
        ) ||
        filteredWorkflows.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ) ||
        channelWorkflows?.some(
          (workflow) =>
            workflow?.boardIds && workflow.boardIds?.includes(board.id),
        ) ||
        filteredWorkflowAssistants.some(
          (assistant) =>
            assistant?.knowledge_hubs &&
            assistant.knowledge_hubs?.includes(board.id),
        ),
    );

    // Filter automations by databoard and workflow
    const filteredAutomations = automations.filter(
      (automation) =>
        filteredBoards.some(
          (board) => board.id && board.id === automation.board_id,
        ) &&
        workflows.some(
          (workflow) =>
            workflow.id && workflow.id?.toString() === automation.workflow_id,
        ),
    );

    const filterAutomationWorkflows = workflows.filter(
      (workflow) =>
        filteredWorkflows.every((wf) => wf.id !== workflow.id) &&
        filteredAutomations.some(
          (automation) => automation.workflow_id === workflow.id?.toString(),
        ),
    );

    // Enrich TableInTable fields with child board fields
    const enrichedBoards = await enrichTableInTableFields(
      orgID,
      filteredBoards,
    );

    const templateData = {
      organization: {
        id: TEMPLATE_ORG_ID,
        name: TEMPLATE_ORG_ID,
        databoards: enrichedBoards,
        automations: filteredAutomations,
        assistants: [
          ...filteredChannelAssistants,
          ...filteredWorkflowAssistants,
        ],
        workflows: [...filteredWorkflows, ...filterAutomationWorkflows],
        channels: channels,
        journeys: [],
      },
    };

    const coordinator = buildGraph(templateData);
    return coordinator;
  } catch (error) {
    logger.info('createOrganizationTemplate Error: ', { error });
    throw handleServiceError(error);
  }
};

// Walk the doc-category tree to the ancestor name path (root-first) for a
// category id. Returns null when the id is not present in the tree.
function findCategoryPath(
  nodes: DocCategoryNode[],
  categoryId: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    const next = [...trail, node.name];
    if (node.id === categoryId) return next;
    const found = node.subCategories?.length
      ? findCategoryPath(node.subCategories, categoryId, next)
      : null;
    if (found) return found;
  }
  return null;
}

// Document AI export helper. For every assistant carrying document_ai.schemas,
// fetch each linked doc_schema (name + attributes) and resolve BOTH category
// ancestor paths — the doc_schema's own category (type 'schema') and the
// provisioned board's category (type 'databoard', from board_category_id) —
// stashing them on the schema entry so installTemplate can recreate the
// schema + categories and provision the board. Best-effort per schema.
async function enrichDocumentAiSchemas(
  orgID: string,
  assistants: Array<{ document_ai?: DocumentAI }>,
): Promise<void> {
  const hasSchemas = assistants.some(
    (a) => a.document_ai?.schemas && a.document_ai.schemas.length > 0,
  );
  if (!hasSchemas) return;

  let schemaCategoryTree: DocCategoryNode[] = [];
  let boardCategoryTree: DocCategoryNode[] = [];
  try {
    schemaCategoryTree = await getDocCategories(orgID, 'schema');
  } catch (err) {
    console.warn('enrichDocumentAiSchemas: failed to load schema categories', err);
  }
  try {
    boardCategoryTree = await getDocCategories(orgID, 'databoard');
  } catch (err) {
    console.warn('enrichDocumentAiSchemas: failed to load board categories', err);
  }

  for (const assistant of assistants) {
    const schemas = assistant.document_ai?.schemas;
    if (!schemas?.length) continue;
    for (const schema of schemas) {
      if (schema.schema_id) {
        try {
          const docSchema = await getDocSchemaById(orgID, schema.schema_id);
          if (docSchema) {
            schema._schema_data = {
              name: docSchema.name ?? schema.data_board_name ?? '',
              attributes: docSchema.attributes ?? [],
            };
            if (docSchema.category_id) {
              schema._schema_category_path =
                findCategoryPath(schemaCategoryTree, docSchema.category_id) ??
                [];
            }
          }
        } catch (err) {
          console.warn(
            `enrichDocumentAiSchemas: failed to fetch doc schema ${schema.schema_id}`,
            err,
          );
        }
      }
      if (schema.board_category_id) {
        schema._board_category_path =
          findCategoryPath(boardCategoryTree, schema.board_category_id) ?? [];
      }
    }
  }
}

// Walk a doc-category tree following the given names (root-first), returning
// the deepest matched node or undefined if the path breaks.
function findNodeByPath(
  nodes: DocCategoryNode[],
  names: string[],
): DocCategoryNode | undefined {
  let level = nodes;
  let found: DocCategoryNode | undefined;
  for (const name of names) {
    found = level.find((n) => n.name === name);
    if (!found) return undefined;
    level = found.subCategories ?? [];
  }
  return found;
}

// Ensure a doc-category path exists in the target org (creating missing levels)
// and return the leaf category id. Tolerant of concurrent creation across the
// parallel assistant-install pass: on a create conflict it re-fetches the tree
// and resolves the node by its full path. Returns null for an empty path.
async function ensureDocCategoryPath(
  orgID: string,
  path: string[],
  type: DocCategoryType,
): Promise<string | null> {
  let parentId: string | null = null;
  let level = await getDocCategories(orgID, type);
  for (let i = 0; i < path.length; i++) {
    const name = path[i];
    let node = level.find((n) => n.name === name);
    if (!node) {
      try {
        node = await createDocCategory(orgID, { name, parentId, type });
      } catch (err) {
        const fresh = await getDocCategories(orgID, type);
        node = findNodeByPath(fresh, path.slice(0, i + 1));
        if (!node) throw err;
      }
    }
    parentId = node.id;
    level = node.subCategories ?? [];
  }
  return parentId;
}

function buildGraph(data: any): Coordinator {
  try {
    const orgData = data.organization;

    // Create root organization.
    const orgResource = createResource(
      orgData.id.toString(),
      orgData.name,
      ResourceType.ORGANIZATION,
      orgData,
    );
    const coordinator = new Coordinator(orgResource);

    // Create maps to hold created nodes.
    const databoardMap = new Map<number, IResource>();
    const aiMap = new Map<number, IResource>();
    const workflowMap = new Map<number, IResource>();
    const channelMap = new Map<number, IResource>();
    const journeyMap = new Map<number, IResource>();
    const automationMap = new Map<number, IResource>();
    const useCaseMap = new Map<string, IResource>();

    // --- First pass: Add Nodes ---
    // Add Databoards first.
    if (orgData.databoards) {
      orgData.databoards.forEach((db: any) => {
        const dbResource = createResource(
          `databoard-${db.id}`,
          db.name,
          ResourceType.DATA_BOARD,
          db,
        );
        databoardMap.set(db.id, dbResource);
        coordinator.addResource(dbResource);
      });
    }
    // Then add AI Assistants.
    if (orgData.assistants) {
      orgData.assistants.forEach((ai: any) => {
        const aiResource = createResource(
          `assistant-${ai.id}`,
          ai.name,
          ResourceType.AI_ASSISTANT,
          ai,
        );
        aiMap.set(ai.id, aiResource);
        coordinator.addResource(aiResource);
      });
    }
    // Now add Workflows.
    if (orgData.workflows) {
      orgData.workflows.forEach((wf: any) => {
        const wfResource = createResource(
          `workflow-${wf.id}`,
          wf.name,
          ResourceType.WORKFLOW,
          wf,
        );
        workflowMap.set(wf.id, wfResource);
        coordinator.addResource(wfResource);
      });
    }
    // Channels.
    if (orgData.channels) {
      orgData.channels.forEach((ch: any) => {
        const chResource = createResource(
          `channel-${ch.id}`,
          ch.name,
          ResourceType.CHANNEL,
          ch,
        );
        channelMap.set(ch.id, chResource);
        coordinator.addResource(chResource);
      });
    }
    // Journeys.
    if (orgData.journeys) {
      orgData.journeys.forEach((j: any) => {
        const jResource = createResource(
          `journey-${j.id}`,
          j.name,
          ResourceType.JOURNEY,
          j,
        );
        journeyMap.set(j.id, jResource);
        coordinator.addResource(jResource);
      });
    }
    // Automations.
    if (orgData.automations) {
      orgData.automations.forEach((auto: any) => {
        const autoResource = createResource(
          `automation-${auto._id}`,
          auto.name,
          ResourceType.AUTOMATION,
          auto,
        );
        automationMap.set(auto._id, autoResource);
        coordinator.addResource(autoResource);
      });
    }
    // Use Case
    if (orgData.useCases) {
      orgData.useCases.forEach((uc: any) => {
        const ucResource = createResource(
          `usecase-${uc.id}`,
          uc.title,
          ResourceType.USE_CASE,
          uc,
        );
        useCaseMap.set(uc.id, ucResource);
        coordinator.addResource(ucResource);
      });
    }

    // --- Second pass: Create Edges ---
    // Link organization to each node in dependency order.
    databoardMap.forEach((db) =>
      coordinator.addEdge(orgData.id.toString(), db.id),
    );
    aiMap.forEach((ai) => coordinator.addEdge(orgData.id.toString(), ai.id));
    workflowMap.forEach((wf) =>
      coordinator.addEdge(orgData.id.toString(), wf.id),
    );
    channelMap.forEach((ch) =>
      coordinator.addEdge(orgData.id.toString(), ch.id),
    );
    useCaseMap.forEach((uc) =>
      coordinator.addEdge(orgData.id.toString(), uc.id),
    );
    journeyMap.forEach((j) => coordinator.addEdge(orgData.id.toString(), j.id));
    automationMap.forEach((auto) =>
      coordinator.addEdge(orgData.id.toString(), auto.id),
    );

    // Additional edges.
    // Channels referencing workflows.
    if (orgData.channels) {
      orgData.channels.forEach((ch: any) => {
        if (ch.workflow_id) {
          const wf = workflowMap.get(parseInt(ch.workflow_id));
          if (wf) {
            coordinator.addEdge(`channel-${ch.id}`, wf.id);
          }
        }
      });
    }
    // Journeys referencing workflows and databoards.
    if (orgData.journeys) {
      orgData.journeys.forEach((j: any) => {
        if (j.workflow) {
          const wf = workflowMap.get(j.workflow);
          if (wf) {
            coordinator.addEdge(`journey-${j.id}`, wf.id);
          }
        }
        if (j.databoard) {
          const db = databoardMap.get(j.databoard);
          if (db) {
            coordinator.addEdge(`journey-${j.id}`, db.id);
          }
        }
      });
    }
    // AI Assistants referencing workflows and databoards.
    if (orgData.assistants) {
      orgData.assistants.forEach((ai: any) => {
        const aiResource = aiMap.get(ai.id);
        if (aiResource) {
          if (ai?.workflow_function_call) {
            ai?.workflow_function_call.forEach((wfId: number) => {
              const wf = workflowMap.get(wfId);
              if (wf) {
                // You can choose the direction of this edge.
                // Either adding an edge from assistant to workflow…
                coordinator.addEdge(aiResource.id, wf.id);
                // …or vice versa.
              }
            });
          }
          if (ai?.knowledge_hubs && Array.isArray(ai.knowledge_hubs)) {
            ai.knowledge_hubs.forEach((dbId: number) => {
              const db = databoardMap.get(dbId);
              if (db) {
                coordinator.addEdge(aiResource.id, db.id);
              }
            });
          }
        }
      });
    }
    // Automations referencing workflows and databoards.
    if (orgData.automations) {
      orgData.automations.forEach((auto: any) => {
        const autoResource = automationMap.get(auto._id);
        if (autoResource) {
          if (auto.workflow_id) {
            const wf = workflowMap.get(parseInt(auto.workflow_id));
            if (wf) {
              coordinator.addEdge(autoResource.id, wf.id);
            }
          }
          if (auto.board_id) {
            const db = databoardMap.get(auto.board_id);
            if (db) {
              coordinator.addEdge(autoResource.id, db.id);
            }
          }
        }
      });
    }

    if (orgData.workflows) {
      orgData.workflows.forEach((wf: any) => {
        const wfResource = workflowMap.get(wf.id);
        if (wfResource) {
          if (wf?.boardIds && Array.isArray(wf.boardIds)) {
            wf.boardIds.forEach((dbId: number) => {
              const db = databoardMap.get(dbId);
              if (db) {
                coordinator.addEdge(wfResource.id, db.id);
              }
            });
          }
          if (wf?.assistantIds && Array.isArray(wf.assistantIds)) {
            wf.assistantIds.forEach((aiId: number) => {
              const ai = aiMap.get(aiId);
              if (ai) {
                coordinator.addEdge(wfResource.id, ai.id);
              }
            });
          }
        }
      });
    }

    if (orgData.useCases) {
      orgData.useCases.forEach((useCase: any) => {
        if (useCase?.channel_id) {
          const ch = channelMap.get(useCase.channel_id);
          if (ch) {
            coordinator.addEdge(`usecase-${useCase.id}`, ch.id);
          }
        }
        if (useCase?.assistant_id) {
          const ai = aiMap.get(useCase.assistant_id);
          if (ai) {
            coordinator.addEdge(`usecase-${useCase.id}`, ai.id);
          }
        }
      });
    }

    return coordinator;
  } catch (error) {
    logger.info('createBoardTemplate Error: ', { error });
    throw handleServiceError(error);
  }
}

async function cloneTemplate(
  orgID: string,
  original: Coordinator,
  deps: any,
  isDisabledNewId: boolean,
  isCloneBoardItems: boolean,
  overrides?: AssistantInstallOverrides,
): Promise<Coordinator> {
  // Clone the nodes map to store all nodes before creating the coordinator
  const clonedNodesMap = new Map<string, IResource>();
  const sharedFolderIdMap = new Map<string, string>();

  const highestLevel = original.getHighestLevel();
  const originalRoot = original.getRoot();
  let newId = uuid().split('-')[0];
  if (isDisabledNewId) {
    newId = '';
  }
  // Process levels from highest to lowest (excluding root at level 0)
  for (let level = highestLevel; level > 0; level--) {
    // Filter out nodes that have already been cloned.
    const nodesAtLevel = original
      .getNodesAtLevelWithoutCutoff(originalRoot.id, level)
      .filter((node) => !clonedNodesMap.has(node.id));

    logger.info(`Cloning Level ${level} with ${nodesAtLevel.length} nodes...`);

    // Clone all nodes at this level
    // Assistants must be cloned sequentially to share folder deduplication map
    const assistantNodes = nodesAtLevel.filter(
      (node) => node.type === ResourceType.AI_ASSISTANT,
    );
    const otherNodes = nodesAtLevel.filter(
      (node) => node.type !== ResourceType.AI_ASSISTANT,
    );

    let clonesAtLevel: IResource[] = [];

    // Clone non-assistant nodes concurrently
    if (otherNodes.length > 0) {
      if (otherNodes.length > 15) {
        for (const node of otherNodes) {
          const clonedNode = await cloneResource(
            orgID,
            node,
            newId,
            isCloneBoardItems,
            sharedFolderIdMap,
            clonedNodesMap,
            overrides,
          );
          clonesAtLevel.push(clonedNode);
          // Populate map eagerly so subsequent assistant clones at this level can resolve refs
          clonedNodesMap.set(node.id, clonedNode);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } else {
        const clonedOthers = await Promise.all(
          otherNodes.map((node) =>
            cloneResource(
              orgID,
              node,
              newId,
              isCloneBoardItems,
              sharedFolderIdMap,
              clonedNodesMap,
              overrides,
            ),
          ),
        );
        clonesAtLevel.push(...clonedOthers);
        // Populate map with otherNodes results BEFORE assistant loop so document_ai/board refs resolve
        otherNodes.forEach((origNode, idx) => {
          if (clonedOthers[idx]) clonedNodesMap.set(origNode.id, clonedOthers[idx]);
        });
      }
    }

    // Clone assistant nodes sequentially to avoid duplicate folder creation
    for (const node of assistantNodes) {
      const clonedNode = await cloneResource(
        orgID,
        node,
        newId,
        isCloneBoardItems,
        sharedFolderIdMap,
        clonedNodesMap,
        overrides,
      );
      clonesAtLevel.push(clonedNode);
    }

    // Rebuild in original order for correct index mapping
    const orderedClones: IResource[] = [];
    let otherIdx = 0;
    let assistantIdx = otherNodes.length;
    for (const node of nodesAtLevel) {
      if (node.type === ResourceType.AI_ASSISTANT) {
        orderedClones.push(clonesAtLevel[assistantIdx++]);
      } else {
        orderedClones.push(clonesAtLevel[otherIdx++]);
      }
    }
    clonesAtLevel = orderedClones;

    clonesAtLevel.forEach((clonedNode, index) => {
      const origNode = nodesAtLevel[index];
      clonedNodesMap.set(origNode.id, clonedNode);
    });
  }

  // Clone the root last
  const clonedRoot = await cloneResource(
    TEMPLATE_ORG_ID,
    originalRoot,
    newId,
    isCloneBoardItems,
    sharedFolderIdMap,
    clonedNodesMap,
    overrides,
  );
  clonedNodesMap.set(originalRoot.id, clonedRoot);

  // Create the coordinator with the root
  const clonedCoordinator = new Coordinator(clonedRoot);

  // Add all other nodes to the coordinator
  clonedNodesMap.forEach((node, id) => {
    if (id !== originalRoot.id) {
      clonedCoordinator.addResource(node);
    }
  });

  // Recreate edges based on original parent-child relationships
  clonedNodesMap.forEach((clonedNode, origId) => {
    const children = original.getChildren(origId);
    children.forEach((child) => {
      const clonedChild = clonedNodesMap.get(child.id);
      if (clonedChild) {
        clonedCoordinator.addEdge(clonedNode.id, clonedChild.id);
      }
    });
  });

  // EXTRA PASS: Update reference fields in each cloned resource using the update function.
  await Promise.all(
    Array.from(clonedNodesMap.entries()).map(async ([key, node]) => {
      const updatedNode = await updateClonedResourceReferences(
        orgID,
        node,
        clonedNodesMap,
        original,
        newId,
        deps,
        overrides,
      );
      // Optionally, update the map with the updated resource if needed.
      clonedNodesMap.set(key, updatedNode);
    }),
  );

  return clonedCoordinator;
}

async function findTemplateById(id: string): Promise<any | null> {
  const repo = TemplateRepositoryFactory.create();
  const template = await repo.findById(id);
  return template ?? null;
}

async function findUseCaseById(id: string): Promise<any | null> {
  const repo = UseCaseRepositoryFactory.create();
  const useCase = await repo.findById(id);
  return useCase ?? null;
}

async function updateUseCase(id: string, data: any): Promise<any | null> {
  const repo = UseCaseRepositoryFactory.create();
  return await repo.update(id, data);
}

function printGraph(
  coordinator: Coordinator,
  nodeId: string,
  indent: number = 0,
  visited = new Set<string>(),
) {
  if (visited.has(nodeId)) {
    logger.info(`${' '.repeat(indent)}- (Already printed ${nodeId})`);
    return;
  }
  visited.add(nodeId);
  const node = coordinator.findResource(nodeId);
  if (!node) return;
  logger.info(
    `${' '.repeat(indent)}- [${node.type}] ${node.name} (ID: ${node.id})`,
  );
  const children = coordinator.getChildren(nodeId);
  children.forEach((child) =>
    printGraph(coordinator, child.id, indent + 2, visited),
  );
}
