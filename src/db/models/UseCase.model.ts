import mongoose from 'mongoose';
import { generalSchemaFactory, generalPreSaveMiddleware } from './utils';
const { Schema } = mongoose;

const UseCaseSchema = new Schema(
    {
        ...generalSchemaFactory('UseCase', 'uc_'),
        title: {
            type: String,
            required: true,
        },
        version: {
            type: Number,
            required: false,
            default: 1,
        },
        organization_id: {
            type: String,
            required: true,
        },
        short_description: {
            type: String,
            required: false,
        },
        description: {
            type: String,
            required: false,
        },
        type: {
            type: String,
            enum: ['custom', 'default'],
            default: 'default',
        },
        channel_id: {
            type: String,
            required: false,
        },
        features: {
            type: [String],
            required: false,
        },
        thumbnail_url: {
            type: String,
            required: false,
        },
        hover_thumbnail_url: {
            type: String,
            required: false,
        },
        media: {
            type: [String],
            required: false,
            default: [],
        },
        tags: {
            type: [String],
            required: false,
        },
        video_url: {
            type: String,
            required: false,
        },
        demo_url: {
            type: String,
            required: false,
        },
        demo_image_url: {
            type: String,
            required: false,
        },
        how_it_works: {
            type: [{
                title: {
                    type: String,
                    required: true
                },
                details: {
                    type: [String],
                    required: true
                }
            }],
            required: false
        },
        suggestion_prompts: {
            type: [String],
            required: false,
        },
        supported_channels: {
            type: [{
                title: {
                    type: String
                },
                icon: {
                    type: String
                }
            }]
        },
        integrations: {
            type: [{
                title: {
                    type: String
                },
                icon: {
                    type: String
                }
            }],
            required: false,
        },
        template_id: {
            type: String,
            required: false,
        },
        assistant_id: {
            type: String,
        },
        user_id: {
            type: String,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        agent_type: {
            type: String,
            required: false,
        },
        // True when this use case is a team's auto-provisioned default agent.
        is_team_default_agent: {
            type: Boolean,
            default: false,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);
UseCaseSchema.index({ title: 1, organization_id: 1 }, { unique: true });

UseCaseSchema.pre('save', generalPreSaveMiddleware);

export default mongoose.model('UseCase', UseCaseSchema);