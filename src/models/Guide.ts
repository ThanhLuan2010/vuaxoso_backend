import mongoose, { Document, Schema } from 'mongoose';

export interface IGuide extends Document {
  title: string;
  subtitle?: string;
  content: string;
  iconType: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const guideSchema = new Schema<IGuide>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    content: { type: String, required: true },
    iconType: { type: String, required: true, default: 'X' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IGuide>('Guide', guideSchema);
