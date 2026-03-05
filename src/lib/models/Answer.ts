import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAnswer extends Document {
  _id: Types.ObjectId;
  questionId: Types.ObjectId;
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  teamId: Types.ObjectId | null;
  text: string;
  isCorrect: boolean | null;
  submittedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  text: { type: String, required: true, maxlength: 2000 },
  isCorrect: { type: Boolean, default: null },
  submittedAt: { type: Date, required: true, default: Date.now },
});

AnswerSchema.index({ questionId: 1, submittedAt: 1 });
AnswerSchema.index({ roomId: 1, userId: 1 });
AnswerSchema.index(
  { questionId: 1, teamId: 1 },
  { unique: true, partialFilterExpression: { teamId: { $ne: null } } }
);
AnswerSchema.index(
  { questionId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { teamId: null } }
);

export default mongoose.models.Answer ||
  mongoose.model<IAnswer>("Answer", AnswerSchema);
