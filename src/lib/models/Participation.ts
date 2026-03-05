import mongoose, { Schema, Document, Types } from "mongoose";

export type ParticipationRole =
  | "quizmaster"
  | "captain"
  | "member"
  | "individual";

export interface IParticipation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  roomId: Types.ObjectId;
  teamId: Types.ObjectId | null;
  role: ParticipationRole;
  answersGiven: number;
  correctAnswers: number;
  totalPoints: number;
  joinedAt: Date;
  leftAt: Date | null;
}

const ParticipationSchema = new Schema<IParticipation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomId: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  teamId: {
    type: Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  role: {
    type: String,
    enum: ["quizmaster", "captain", "member", "individual"],
    required: true,
  },
  answersGiven: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null },
});

ParticipationSchema.index({ userId: 1, joinedAt: -1 });
ParticipationSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Participation ||
  mongoose.model<IParticipation>("Participation", ParticipationSchema);
