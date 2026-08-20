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

export interface AIAssistant {
    id?: string;
    created_at: number;
    name: string;
    description: string;
    model: string;
    model_id?: string;
    provider_id?: string;
    instructions: string;
    file_ids: string[];
    folder_ids?: string[];
    board_ids?: string[];
    default_folder_id?: string;
    metadata: {
        other_requirements?: OtherRequirement[];
        channel_id?: string;
        workflow_id: string;
        workflow_function_call?: number[];
    };
    document_ai?: DocumentAI;
    mode: string;
    channel: string;
    category: string[];
    personality_role: string;
    core_task: string;
    agent_type?: string;
    streaming?: boolean;
    sub_agents?: string[];
    tone_and_style: string;
    response_length: string;
    banned_words: string;
    workflow_function_call?: string[];
    knowledge_hubs?: string[];
    workflow_name?: string;
    version?: number;
    guardrail_id?: string;
    vibe_code: boolean;
}

export interface GuardRail {
    name: string;
    description: string;
    instructions: string;
    model: string;
    unsafe_categories: string[];
    org_id: string;
    custom_unsafe_patterns: string[];
    competitor_keywords: string[];

}

export interface OtherRequirement {
    author_avatar: string;
    author_name: string;
    message: string;
    updated_at: string;
    requirement: string;
}

export type AssistantInstallOverrides = {
    model_id?: string;
    provider_id?: string;
    vlm_model?: string;
    vlm_provider_id?: string;
};
