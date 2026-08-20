import mongoose from 'mongoose';
import { generalSchemaFactory, generalPreSaveMiddleware } from './utils';
const { Schema } = mongoose;

const EmailSenderSchema = new Schema({
  // schema
  ...generalSchemaFactory('Senders', 'email_'),
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  organization_id: {
    type: String,
  },
  deleted_at: {
    type: Date,
  },
},{
  versionKey: false,
});

EmailSenderSchema.pre('save', generalPreSaveMiddleware);

EmailSenderSchema.index({ email: 1, organization_id: 1 }, { unique: true });
EmailSenderSchema.index({ user_id: 1, organization_id: 1 }, { unique: true });
EmailSenderSchema.index({ email: 'text', title: 'text', description: 'text' });

export default mongoose.model('EmailSender', EmailSenderSchema);