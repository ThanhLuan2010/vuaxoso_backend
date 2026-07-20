import mongoose, { Document, Schema } from 'mongoose';

export interface IProvince extends Document {
  provinceId: string;
  name: string;
  code: string;
  region: 'MB' | 'MT' | 'MN';
  drawDays: number[]; // 0: Sunday, 1: Monday, ... 6: Saturday
  createdAt: Date;
  updatedAt: Date;
}

const ProvinceSchema: Schema = new Schema(
  {
    provinceId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    region: { type: String, enum: ['MB', 'MT', 'MN'], required: true },
    drawDays: [{ type: Number }]
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IProvince>('Province', ProvinceSchema);
