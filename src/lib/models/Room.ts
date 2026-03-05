import mongoose, { Schema, Document, Types } from "mongoose";

export type RoomMode = "individual" | "team";
export type RoomStatus = "waiting" | "active" | "closed";

export interface IRoom extends Document {
  _id: Types.ObjectId;
  code: string;
  name: string;
  quizmasterId: Types.ObjectId;
  mode: RoomMode;
  maxTeams?: number;
  maxTeamSize: number;
  bannedUserIds: Types.ObjectId[];
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
    maxTeams: { type: Number, default: null },
    maxTeamSize: { type: Number, default: 5 },
    bannedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
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
