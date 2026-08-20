import logger from '../../../../server/logging/logger';
import { IResource } from '../interface';
import { IKnowledgeHubFolder } from '../../../repositories/knowledge_hub.repository';

export interface DocumentAISchema {
  board_id?: string;
  schema_id?: string;
  data_board_name?: string;
  board_category_id?: string | null;
  board_deployment_access?: string[];
  _schema_data?: {
    name: string;
    attributes: any[];
  };
  _schema_category_path?: string[];
  _board_category_path?: string[];
}

export interface DocumentAI {
  vlm_provider_id?: string;
  vlm_model?: string;
  source_languages?: string[];
  handwriting_support?: boolean;
  schemas?: DocumentAISchema[];
  time_offset?: string;
  continue_on_failure?: boolean;
  retry_time?: number;
}

export interface Metadata {
  other_requirements?: OtherRequirement[];
  channel_id?: string;
  workflow_id: string;
  workflow_function_call?: number[];
  // Passthrough for agent-specific metadata (e.g. max_token_limit) so export
  // copies it verbatim instead of dropping unknown keys.
  [key: string]: any;
}

export interface OtherRequirement {
  author_avatar: string;
  author_name: string;
  message: string;
  updated_at: string;
  requirement: string;
}


export interface IAiAssistantParameters {
  id: string;
  created_at: number;
  name: string;
  workflow_name: string;
  description: string;
  model: string;
  instructions: string;
  file_ids: string[];
  metadata: Metadata;
  document_ai?: DocumentAI;
  mode: string;
  channel: string;
  category: string[];
  personality_role: string;
  core_task: string;
  tone_and_style: string;
  response_length: string;
  banned_words: string;
  workflow_function_call: string[];
  new_workflow_function_call?: string[];
  knowledge_hubs: string[];
  original_assistant_id?: string;
  version?: number;
  guardrail_id?: string;
  agent_type?: string;
  sub_agents?: string[];
  streaming?: boolean;
  folder_ids?: string[];
  board_ids?: string[];
  default_folder_id?: string;
  folders?: IKnowledgeHubFolder[];
  vibe_code?: boolean;
}

export class AiAssistant {
  id: string;
  created_at: number;
  name: string;
  workflow_name: string;
  description: string;
  model: string;
  instructions: string;
  file_ids: string[];
  metadata: Metadata;
  document_ai?: DocumentAI;
  mode: string;
  channel: string;
  category: string[];
  personality_role: string;
  core_task: string;
  tone_and_style: string;
  response_length: string;
  banned_words: string;
  workflow_function_call: string[];
  knowledge_hubs: string[];
  new_workflow_function_call?: string[];
  original_assistant_id?: string;
  version: number;
  guardrail_id?: string;
  agent_type?: string;
  sub_agents?: string[];
  streaming?: boolean;
  folder_ids?: string[];
  board_ids?: string[];
  default_folder_id?: string;
  folders?: IKnowledgeHubFolder[];
  vibe_code: boolean;

  constructor(parameters: IAiAssistantParameters) {
    this.id = parameters.id;
    this.name = parameters.name;
    this.workflow_name = parameters.workflow_name;
    this.created_at = parameters.created_at;
    this.description = parameters.description;
    this.model = parameters.model;
    this.instructions = parameters.instructions;
    this.file_ids = parameters.file_ids;
    this.metadata = parameters.metadata;
    this.document_ai = parameters?.document_ai;
    this.channel = parameters.channel;
    this.category = parameters.category;
    this.personality_role = parameters.personality_role;
    this.core_task = parameters.core_task;
    this.tone_and_style = parameters.tone_and_style;
    this.response_length = parameters.response_length;
    this.banned_words = parameters.banned_words;
    this.workflow_function_call = parameters.workflow_function_call;
    this.knowledge_hubs = parameters.knowledge_hubs;
    this.mode = parameters.mode;
    this.new_workflow_function_call = parameters?.new_workflow_function_call;
    this.original_assistant_id = parameters?.original_assistant_id;
    this.version = parameters?.version || 1;
    this.guardrail_id = parameters?.guardrail_id;
    this.agent_type = parameters?.agent_type ?? "agent";
    this.sub_agents = parameters?.sub_agents ?? [];
    this.streaming = parameters?.streaming ?? false;
    this.folder_ids = parameters?.folder_ids ?? [];
    this.board_ids = parameters?.board_ids ?? [];
    this.default_folder_id = parameters?.default_folder_id ?? undefined;
    this.folders = parameters?.folders ?? [];
    this.vibe_code = parameters?.vibe_code ?? false;
  }

  toDataBoardParameters(): IAiAssistantParameters {
    return {
      id: this.id,
      name: this.name,
      workflow_name: this.workflow_name,
      created_at: this.created_at,
      description: this.description,
      model: this.model,
      instructions: this.instructions,
      file_ids: this.file_ids,
      metadata: this.metadata,
      document_ai: this?.document_ai,
      channel: this.channel,
      category: this.category,
      personality_role: this.personality_role,
      core_task: this.core_task,
      tone_and_style: this.tone_and_style,
      response_length: this.response_length,
      banned_words: this.banned_words,
      workflow_function_call: this.workflow_function_call,
      knowledge_hubs: this.knowledge_hubs,
      mode: this.mode,
      new_workflow_function_call: this?.new_workflow_function_call,
      original_assistant_id: this?.original_assistant_id,
      version: this?.version ?? 1,
      guardrail_id: this?.guardrail_id,
      agent_type: this?.agent_type,
      sub_agents: this?.sub_agents,
      streaming: this?.streaming,
      folder_ids: this?.folder_ids,
      board_ids: this?.board_ids,
      default_folder_id: this?.default_folder_id,
      folders: this?.folders,
      vibe_code: this?.vibe_code,
    };
  }

  clone(): this {
    return new AiAssistant(this.toDataBoardParameters()) as this;
  }

  add(...resources: IResource[]): void {
    logger.info(resources);
    return;
  }
}
