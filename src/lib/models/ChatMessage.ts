import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChatMessage extends Document {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

ChatMessageSchema.index({ roomId: 1, teamId: 1, createdAt: 1 });
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
