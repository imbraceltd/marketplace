import mongoose from 'mongoose';
import { generalSchemaFactory, generalPreSaveMiddleware } from './utils';

const { Schema } = mongoose;

const FileSchema = new Schema(
  {
    ...generalSchemaFactory('File', 'file_'),
    name: {
      type: String,
      required: true,
    },
    organization_id: {
      type: String,
      default: null,
    },

    short_path: {
      type: String,
      required: true,
      unique: true,
    },

    is_public: {
      type: Boolean,
      default: false,
    },

    size: {
      type: Number,
    },

    brief: {
      type: String,
    },

    description: {
      type: String,
    },

    file_type: {
      type: String,
    },

    file_extension: {
      type: String,
    },

    file_path: {
      type: String,
    },

    file_url: {
      type: String,
    },

    file_thumbnail_url: {
      type: String,
    },

    TTL: {
      type: Number,
      default: 0,
    },

    will_delete_at: {
      type: Date,
      default: null,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

FileSchema.pre('save', generalPreSaveMiddleware);
FileSchema.index({ short_path: 1, organization_id: 1, deleted: 1 });
FileSchema.index({file_path: 1});
// full text search
FileSchema.index({ name: 'text', brief: 'text', description: 'text' });

export default mongoose.model('File', FileSchema);
