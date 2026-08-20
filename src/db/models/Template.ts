import mongoose from 'mongoose';
import { generalSchemaFactory } from './utils';
const { Schema } = mongoose;

const TemplateSchema = new Schema(
    {
        ...generalSchemaFactory('', 'template_'),
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        graph: {
            type: Object,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        original_id: {
            type: String,
            default: '',
        },
        organization_id: {
            type: String,
            required: true,
        },
        deps:{
            type: Object,
            default: null,
        },
        active: {
            type: Boolean,
            default: false,
        }
    },
    {
        versionKey: false,
        timestamps: true,
    }
);


TemplateSchema.index({ title: 1, organization_id: 1 });

export default mongoose.model('Template', TemplateSchema);
