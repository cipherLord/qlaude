import mongoose, { Schema, Document, Types } from "mongoose";

export type TeamStatus = "active" | "disqualified";

export interface ITeam extends Document {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  name: string;
  code: string;
  passwordHash: string | null;
  captainId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  status: TeamStatus;
  disqualifiedAt: Date | null;
  disqualifyReason: string | null;
  createdAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    code: { type: String, required: true },
    passwordHash: { type: String, default: null },
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["active", "disqualified"],
      default: "active",
    },
    disqualifiedAt: { type: Date, default: null },
    disqualifyReason: { type: String, default: null, maxlength: 200 },
  },
  { timestamps: true }
);

TeamSchema.index({ roomId: 1, code: 1 }, { unique: true });

export default mongoose.models.Team ||
  mongoose.model<ITeam>("Team", TeamSchema);
