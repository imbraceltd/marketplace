import mongoose from 'mongoose';
import { generalSchemaFactory, generalPreSaveMiddleware } from './utils';

const { Schema } = mongoose;

const IconSchema = new Schema(
  {
    namespace: {
      type: String,
    },
    name: {
      type: String,
    },
  },
  {
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

// would be implemented /src/core/domain/app/App.ts
const AppSchema = new Schema(
  {
    // schema
    ...generalSchemaFactory('App', 'app_'),

    // legacy
    icon: {
      type: IconSchema,
    },

    // is_hidden
    is_hidden: {
      type: Boolean,
      default: false,
    },

    // channel
    channel: {
      channel_type: {
        type: String,
      },
      id: {
        type: String,
      },
      name: {
        type: String,
      },
    },

    title: {
      type: String,
    },
    description: {
      type: String,
    },
    url: {
      type: String,
    },
    organization_id: {
      type: String,
      required: true,
    },
    business_unit_id: {
      type: String,
    },

    // created by
    user_id: {
      type: String,
    },

    // version
    version: {
      type: String,
    },

    // workflow_id
    workflow_id: {
      type: String,
      required: true,
    },

    // Options for the app
    options: {
      type: Object,
    },

    // this is the data that will be used to create the workflow
    credentials: {
      type: Object,
    },

    // default credentials
    default_credentials: {
      type: Object,
    },

    // in case of install from product
    product_id: {
      type: String,
    },

    // current progress
    user_progress: {
      type: Object,
    },

    app_type: {
      type: String,
      enum: ['customization', 'marketplace'],
    },

    // app status
    is_active: {
      type: Boolean,
      default: false,
    },

    // app deleted
    is_deleted: {
      type: Boolean,
      default: false,
    },

    // Categories
    categories: {
      type: [String],
    },

    // Channels or Platforms
    channels_or_platforms: {
      type: [String],
    },

    banner_image: {
      type: String,
    },

    icon_image: {
      type: String,
    },

    // sub workflows
    sub_workflows: {
      type: [String],
    },

    root_channel_workflow_id: {
      type: String,
    },

    product_type: {
      type: String,
    },

    product_code: {
      type: String,
    },

    created_from: {
      type: String,
    },
    // a map of data board id that app is using directly without any workflow
    direct_data_board: [
      {
        board_id: {
          type: String,
          require: true,
        },
        board_name: {
          type: String,
          require: true,
        },
      },
    ],

    tags: {
      type: [String],
    },
  },
  {
    versionKey: false,
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        if (!ret.product_code || ret.product_code === '') {
          ret.product_code = ret.title
            .toString()
            .split(' - ')[0]
            .toLowerCase()
            .replace(/ /g, '_');
        }
        return ret;
      },
    },
  }
);

AppSchema.pre('save', generalPreSaveMiddleware);

AppSchema.methods.findByChannelId = async function (
  channelId: string,
  organizationId: string
) {
  return await this.model('App').findOne({
    'channel.id': channelId,
    organization_id: organizationId,
  });
};

AppSchema.index({ organization_id: 1, business_unit_id: 1, title: 1 });
AppSchema.index({ organization_id: 1, 'channel.id': 1 });

// full text search
AppSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('App', AppSchema);
