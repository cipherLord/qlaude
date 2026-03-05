import mongoose, { Schema, Document, Types } from "mongoose";

export type QuizmateStatus = "pending" | "accepted" | "declined";

export interface IQuizmate extends Document {
  _id: Types.ObjectId;
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: QuizmateStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

const QuizmateSchema = new Schema<IQuizmate>({
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
});

QuizmateSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
QuizmateSchema.index({ recipientId: 1, status: 1 });

export default mongoose.models.Quizmate ||
  mongoose.model<IQuizmate>("Quizmate", QuizmateSchema);
