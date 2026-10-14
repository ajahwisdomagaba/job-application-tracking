import mongoose from 'mongoose';
import { STAGES } from '../utils/stageTransitions.js';

const { ObjectId } = mongoose.Schema.Types;

const statusHistorySchema = new mongoose.Schema(
  {
    application: { type: ObjectId, ref: 'Application', required: true, index: true, immutable: true },
    oldStage: { type: String, enum: [...STAGES, null], default: null, immutable: true },
    newStage: { type: String, enum: STAGES, required: true, immutable: true },
    changedBy: { type: ObjectId, ref: 'User', required: true, immutable: true },
    changedAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false, versionKey: false }
);

// ---- Append-only enforcement -------------------------------------------------
const blocked = (op) =>
  async function () {
    throw new Error(`StatusHistory is append-only: ${op} is not allowed.`);
  };

[
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany',
].forEach((op) => statusHistorySchema.pre(op, blocked(op)));

statusHistorySchema.pre('updateOne', { document: true, query: false }, blocked('updateOne'));
statusHistorySchema.pre('deleteOne', { document: true, query: false }, blocked('deleteOne'));
statusHistorySchema.pre('save', async function () {
  if (!this.isNew) throw new Error('StatusHistory is append-only: existing entries cannot be saved again.');
});


statusHistorySchema.statics.record = async function (
  { application, oldStage = null, newStage, changedBy },
  session
) {
  const [entry] = await this.create([{ application, oldStage, newStage, changedBy }], { session });
  return entry;
};

export default mongoose.model('StatusHistory', statusHistorySchema);