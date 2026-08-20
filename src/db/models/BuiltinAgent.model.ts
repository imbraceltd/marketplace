import mongoose from 'mongoose';

const { Schema } = mongoose;

const BuiltinAgentSchema = new Schema(
  {
    _id: { type: String, required: true },
    assistant_id: { type: String, required: true, unique: true },
    is_builtin: { type: Boolean, default: true },

    title: { type: String, required: true },
    name: { type: String },
    short_description: { type: String },
    description: { type: String },
    agent_type: { type: String },
    suggestion_prompts: { type: [String], default: [] },
    thumbnail_url: { type: String },
    hover_thumbnail_url: { type: String },

    instructions: { type: String },
    core_task: { type: String },
    personality_role: { type: String },
    tone_and_style: { type: String },
    response_length: { type: String },
    banned_words: { type: String },
    model: { type: String },
    model_id: { type: String },
    temperature: { type: Number },
    streaming: { type: Boolean },
    show_thinking_process: { type: Boolean },
    use_memory: { type: Boolean },
    vibe_code: { type: Boolean },
    mode: { type: String },
    provider_id: { type: String },
    workflow_name: { type: String },
    credential_id: { type: String, default: null },
    credential_name: { type: String },
    board_ids: { type: [String], default: [] },
    folder_ids: { type: [String], default: [] },
    default_folder_id: { type: String },
    file_ids: { type: [String], default: [] },
    knowledge_hubs: { type: [Schema.Types.Mixed], default: [] },
    workflow_function_call: { type: [Schema.Types.Mixed], default: [] },
    sub_agents: { type: [Schema.Types.Mixed], default: [] },
    preload_information: { type: String },
    preload_information_type: { type: String },
    guardrail_id: { type: String },
    document_ai: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },

    version: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: 'openai_assistant_builtin_agent',
    versionKey: false,
    strict: false,
  }
);

export default mongoose.model('BuiltinAgent', BuiltinAgentSchema);
