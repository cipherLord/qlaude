import mongoose, { Schema, Document, Types } from "mongoose";

export type QuestionStatus = "pending" | "active" | "closed";

export interface IQuestion extends Document {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  text: string;
  order: number;
  timerSeconds: number;
  status: QuestionStatus;
  points: number;
  parts: number;
  correctAnswer: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    text: { type: String, required: true, maxlength: 1000 },
    order: { type: Number, required: true },
    timerSeconds: { type: Number, required: true, min: 5, max: 300 },
    status: {
      type: String,
      enum: ["pending", "active", "closed"],
      default: "pending",
    },
    points: { type: Number, default: 10, min: 1, max: 100 },
    parts: { type: Number, default: 1, min: 1, max: 10 },
    correctAnswer: { type: String, default: null },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ["image", "video", null], default: null },
  },
  { timestamps: true }
);

QuestionSchema.index({ roomId: 1, order: 1 });

export default mongoose.models.Question ||
  mongoose.model<IQuestion>("Question", QuestionSchema);
