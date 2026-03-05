import mongoose, { Schema, Document, Types } from "mongoose";

export interface IScore extends Document {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  userId: Types.ObjectId | null;
  teamId: Types.ObjectId | null;
  points: number;
  correctCount: number;
}

const ScoreSchema = new Schema<IScore>({
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  points: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
});

ScoreSchema.index({ roomId: 1, points: -1 });
ScoreSchema.index({ roomId: 1, userId: 1 }, { sparse: true });
ScoreSchema.index({ roomId: 1, teamId: 1 }, { sparse: true });

export default mongoose.models.Score ||
  mongoose.model<IScore>("Score", ScoreSchema);
