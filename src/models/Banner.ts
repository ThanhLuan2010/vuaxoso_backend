import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  imageUrl: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema: Schema = new Schema({
  imageUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

BannerSchema.index({ isActive: 1, order: 1, createdAt: -1 });

export default mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema);
