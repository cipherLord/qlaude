import mongoose, { Schema, Document, Types } from "mongoose";

export type QuestionStatus = "pending" | "active" | "closed";
export type QuestionPhase = "pounce" | "pounce_marking" | "waiting_for_bounce" | "direct" | "bounce" | "resolved" | null;

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
  pouncePoints: number | null;
  pouncePenalty: number | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  assignedTeamId: Types.ObjectId | null;
  questionPhase: QuestionPhase;
  currentBounceTeamId: Types.ObjectId | null;
  attemptedTeamIds: Types.ObjectId[];
  pouncedTeamIds: Types.ObjectId[];
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
    pouncePoints: { type: Number, default: null, min: 1, max: 100 },
    pouncePenalty: { type: Number, default: null, min: 1, max: 100 },
    mediaUrl: { type: String, default: null },
    mediaType: { type: String, enum: ["image", "video", null], default: null },
    assignedTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    questionPhase: {
      type: String,
      enum: ["pounce", "pounce_marking", "waiting_for_bounce", "direct", "bounce", "resolved", null],
      default: null,
    },
    currentBounceTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    attemptedTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    pouncedTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
  },
  { timestamps: true }
);

QuestionSchema.index({ roomId: 1, order: 1 });

export default mongoose.models.Question ||
  mongoose.model<IQuestion>("Question", QuestionSchema);
