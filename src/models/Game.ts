import mongoose, { Document, Schema } from 'mongoose';

export interface IGame extends Document {
  code: string; // e.g. keno, mega_645, max_3d
  name: string;
  type: 'vietlott' | 'dientoan' | 'kienthiet';
  brandColor?: string;
  bgColor?: string;
  badge?: string; // e.g. "10p-1 kỳ"
  isActive: boolean;
  cronExpression?: string; // e.g. "*/10 * * * *"
  drawDurationMinutes?: number; // e.g. 10
  autoRandomResult?: boolean;
  riggedResult?: string;
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['vietlott', 'dientoan', 'kienthiet'], required: true },
    brandColor: { type: String },
    bgColor: { type: String },
    badge: { type: String },
    isActive: { type: Boolean, default: true },
    cronExpression: { type: String },
    drawDurationMinutes: { type: Number, default: 10 },
    autoRandomResult: { type: Boolean, default: false },
    riggedResult: { type: String }
  },
  { timestamps: true }
);

export default mongoose.model<IGame>('Game', gameSchema);
