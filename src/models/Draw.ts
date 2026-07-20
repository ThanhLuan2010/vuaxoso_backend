import mongoose, { Document, Schema } from 'mongoose';
import { IGame } from './Game';

export interface IDraw extends Document {
  game: mongoose.Types.ObjectId | IGame;
  drawCode: string; // e.g. #00742
  openTime: Date;
  closeTime: Date; // countdown to this
  status: 'open' | 'closed' | 'completed'; // open=can buy, closed=waiting results, completed=results entered
  winningNumbers: string[]; // ["56", "65"]
  jackpotAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const drawSchema = new Schema<IDraw>(
  {
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
    drawCode: { type: String, required: true },
    openTime: { type: Date, required: true },
    closeTime: { type: Date, required: true },
    status: { type: String, enum: ['open', 'closed', 'completed'], default: 'open' },
    winningNumbers: [{ type: String }],
    jackpotAmount: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IDraw>('Draw', drawSchema);
