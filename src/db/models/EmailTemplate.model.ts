import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { generalSchemaFactory, generalPreSaveMiddleware } from './utils';
import { IEmailTemplate } from '../../core/domains/interface/emailTemplate';

const AttachmentSchema = new Schema<IEmailTemplate>(
  {
    name: { type: String },
    url: { type: String },
    file_id: { type: String },
  },
  {
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  }
);

const EmailTemplateSchema = new Schema(
  {
    ...generalSchemaFactory('EmailTemplate', 'ema_'),
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },

    // Map of name and value
    variables: {
      type: Map,
      of: {
        name: { type: String, required: true },
        board_id: { type: String },
        field_id: { type: String },
        value: { type: String },
      },
    },

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },

    // CategoryModel
    category: {
      type: String,
    },

    unsubscribe_link: { type: String },
    unsubscribe_text: { type: String },

    // Array of link
    links: [
      {
        link: { type: String },
        text: { type: String },
        brief: { type: String },
        description: { type: String },
      },
    ],

    organization_id: { type: String },

    // Array of attachment
    attachments: [AttachmentSchema],

    app_id: { type: String },

    board_id: { type: String },

    template_language: { type: String },
  },
  {
    versionKey: false,
  }
);

EmailTemplateSchema.pre('save', generalPreSaveMiddleware);
EmailTemplateSchema.index({
  name: 'text',
  description: 'text',
  subject: 'text',
  body: 'text',

  // category name as well
  category: 'text',
});
EmailTemplateSchema.index({ organization_id: 1, app_id: 1 });
EmailTemplateSchema.index({ name: 1, app_id: 1 }, { unique: true });
EmailTemplateSchema.index({ category: 1 });

export default mongoose.model('EmailTemplate', EmailTemplateSchema);
