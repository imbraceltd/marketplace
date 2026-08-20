import mongoose from 'mongoose';

const { Schema } = mongoose;

interface IMigrate extends mongoose.Document {
  tag: string;
  success: boolean;
  setSuccess(id: string): Promise<void>;
  shouldRunMigration(id: string): Promise<boolean>;
  startMigration(id: string): Promise<void>;
  resetMigration(id: string): Promise<void>;
}

const MigrateSchema = new Schema<IMigrate>({
  tag: { type: String, required: true },
  success: { type: Boolean, default: false },
});

// Static methods for model level operations
MigrateSchema.statics.startMigration = async function (id) {
  const existing = await this.findOne({ tag: id });
  if (!existing) {
    const migration = new this({ tag: id, success: false });
    await migration.save();
    return true;
  }

  if (existing.success) {
    return false;
  }

  return true;
};

MigrateSchema.statics.setSuccess = async function (id) {
  return await this.updateOne({ tag: id }, { $set: { success: true } });
};

MigrateSchema.statics.resetMigration = async function (id) {
  return await this.updateOne({ tag: id }, { $set: { success: false } });
};

MigrateSchema.statics.shouldRunMigration = async function (id) {
  const migration = await this.findOne({ tag: id });
  return !migration || !migration.success;
};

interface IMigrateModel extends mongoose.Model<IMigrate> {
  setSuccess(id: string): Promise<void>;
  shouldRunMigration(id: string): Promise<boolean>;
  startMigration(id: string): Promise<boolean>;
  resetMigration(id: string): Promise<void>;
}

export default mongoose.model<IMigrate, IMigrateModel>(
  'Migrate',
  MigrateSchema
);
