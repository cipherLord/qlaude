import mongoose, { Schema, Document, Types } from "mongoose";

export type RoomMode = "individual" | "team";
export type RoomStatus = "waiting" | "active" | "closed";
export type ScoringMode = "normal" | "bounce" | "pounce_bounce";

export interface IRoom extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  quizmasterId: Types.ObjectId;
  mode: RoomMode;
  scoringMode: ScoringMode;
  pouncePoints: number | null;
  pouncePenalty: number | null;
  totalQuestions: number;
  isTiebreaker: boolean;
  tiebreakerEntityIds: Types.ObjectId[];
  maxTeams?: number;
  maxTeamSize: number;
  bannedUserIds: Types.ObjectId[];
  teamOrder: Types.ObjectId[];
  playerOrder: Types.ObjectId[];
  currentTeamIndex: number;
  expiresAt: Date;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    quizmasterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mode: {
      type: String,
      enum: ["individual", "team"],
      required: true,
    },
    scoringMode: {
      type: String,
      enum: ["normal", "bounce", "pounce_bounce"],
      default: "normal",
    },
    pouncePoints: { type: Number, default: null, min: 1, max: 100 },
    pouncePenalty: { type: Number, default: null, min: 1 },
    totalQuestions: { type: Number, default: 0, min: 0 },
    isTiebreaker: { type: Boolean, default: false },
    tiebreakerEntityIds: [{ type: Schema.Types.ObjectId }],
    maxTeams: { type: Number, default: null },
    maxTeamSize: { type: Number, default: 5 },
    bannedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    teamOrder: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    playerOrder: [{ type: Schema.Types.ObjectId, ref: "User" }],
    currentTeamIndex: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["waiting", "active", "closed"],
      default: "waiting",
    },
  },
  { timestamps: true }
);

RoomSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.models.Room ||
  mongoose.model<IRoom>("Room", RoomSchema);
