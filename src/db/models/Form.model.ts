import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { getGeneralSchema, generalPreSaveMiddleware } from './utils';
import { Form } from '../../core/domains/interface/form';

const FormSchema = new Schema<Form>(
  {
    ...getGeneralSchema('Form'),
    name: { type: String, required: true },
    description: { type: String },
    extended_from: { type: String },
    board_id: { type: String },
    board_name: { type: String },
    type: { type: String },
    engagement_count: { type: Number, default: 0 },
    submitted_count: { type: Number, default: 0 },

    teams: {
      type: [
        {
          team_id: { type: String },
          team_name: { type: String },
        },
      ],
    },

    owner: {
      user_id: { type: String },
      user_name: { type: String },
    },
    organization_id: { type: String, required: true },
    start_date: { type: String },
    end_date: { type: String },
    app_id: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    created_by: { type: String, required: true },
    
    // - determine if captcha is enabled for the form
    use_captcha: { type: Boolean, default: false },
    // UI
    hidden: { type: Boolean, default: false },
    id: { type: String },
    data_board_id: { type: String, required: true },
    contact_board_id: { type: String, required: true },
    submit_button_text: { type: String, default: 'Submit' },
    footer: { type: String, default: 'Powered by iMBrace Limited' },
    header: { type: String },
    sub_header: { type: String },
    banner_image: { type: String },
    logo: { type: String },

    // Form Fields
    fields: {
      type: [
        {
          field_id: { type: String },
          name: { type: String, required: true },
          description: { type: String },
          is_system: { type: Boolean, default: false },
          settings: { type: Object },
          type: {
            type: String,
            enum: [
              'ShortText',
              'SingleSelection',
              'MultipleSelection',
              'Date',
              'Time',
              'LongText',
              'Number',
              'Email',
              'Phone',
              'Link',
              'Priority',
              'Assignee',
              'Datetime',
              'Country',
              'Checkbox',
              'Captcha',
              'Currency',
              'Notes',
              'Attachment',
              'Assignee',
            ],
            default: 'ShortText',
          },
          is_unique_identifier: { type: Boolean },
          is_default: { type: Boolean },
          hidden: { type: Boolean },
          hidden_in_form: { type: Boolean, default: false },
          is_identifier: { type: Boolean },
          data: {
            type: [
              {
                value: { type: String, required: true },
                _id: { type: String },
              },
            ],
          },
          default_value: { type: String },
          required: { type: Boolean, default: false },
          placeholder: { type: String },
          field_name: { type: String, required: true },
          title: { type: String },
          field_description: { type: String },
        },
      ],

      default: [],
    },

    // Map of name and contact board field id
    map_to_contact: {
      type: Map,
      of: String,
    },
  },
  {
    versionKey: false,
  }
);

// full text search
FormSchema.index({ name: 'text', description: 'text', board_name: 'text' });

// index
FormSchema.index({ name: 1, organization_id: 1, app_id: 1 }, { unique: true });

// index
FormSchema.index({ organization_id: 1, app_id: 1, public_id: 1 });

// pre save middleware
FormSchema.pre('save', generalPreSaveMiddleware);

export default mongoose.model('Form', FormSchema);
