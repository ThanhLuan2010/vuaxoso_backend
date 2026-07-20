import mongoose, { Document, Schema } from 'mongoose';

export interface ICoBuyParticipant {
  user: mongoose.Types.ObjectId;
  percent: number;
  cost: number;
  joinedAt: Date;
}

export interface ICoBuyRoom extends Document {
  gameType: 'mega' | 'power';
  roomNum: string;
  baoType: number;
  totalCost: number;
  minGop: number;
  drawNum: string;
  drawDate: string;
  closeTime: string;
  progress: number;
  status: 'open' | 'closed' | 'completed';
  participants: ICoBuyParticipant[];
  ticketNumbers: string[];
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<ICoBuyParticipant>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  percent: { type: Number, required: true },
  cost: { type: Number, required: true },
  joinedAt: { type: Date, default: Date.now }
});

const coBuyRoomSchema = new Schema<ICoBuyRoom>(
  {
    gameType: { type: String, enum: ['mega', 'power'], required: true },
    roomNum: { type: String, required: true, unique: true },
    baoType: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    minGop: { type: Number, required: true },
    drawNum: { type: String, required: true },
    drawDate: { type: String, required: true },
    closeTime: { type: String, required: true },
    progress: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'closed', 'completed'], default: 'open' },
    participants: [participantSchema],
    ticketNumbers: [{ type: String }]
  },
  { timestamps: true }
);

export default mongoose.model<ICoBuyRoom>('CoBuyRoom', coBuyRoomSchema);
