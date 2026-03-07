import mongoose, { Schema, Document, Types } from "mongoose";

export type RoomMessageType = "broadcast" | "hint_request";
export type RoomMessageStatus = "active" | "blocked" | "answered" | "declined";

export interface IRoomMessage extends Document {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  type: RoomMessageType;
  text: string;
  status: RoomMessageStatus;
  blockedBy: Types.ObjectId | null;
  response: string | null;
  createdAt: Date;
}

const RoomMessageSchema = new Schema<IRoomMessage>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["broadcast", "hint_request"], required: true },
    text: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ["active", "blocked", "answered", "declined"], default: "active" },
    blockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    response: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true }
);

RoomMessageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.models.RoomMessage ||
  mongoose.model<IRoomMessage>("RoomMessage", RoomMessageSchema);
