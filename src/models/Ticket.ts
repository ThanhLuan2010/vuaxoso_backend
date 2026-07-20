import mongoose, { Document, Schema } from 'mongoose';

export interface ITicket extends Document {
  number: string;
  price: number;
  ticketType: 'normal' | 'special';
  multiplier?: number;
  provinceId: string;
  drawDate: string;
  isSold: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema: Schema = new Schema(
  {
    number: { type: String, required: true },
    price: { type: Number, default: 10000 },
    ticketType: { type: String, enum: ['normal', 'special'], default: 'normal' },
    multiplier: { type: Number },
    provinceId: { type: String, required: true },
    drawDate: { type: String, required: true },
    isSold: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

TicketSchema.index({ provinceId: 1, drawDate: 1, isSold: 1 });
TicketSchema.index({ number: 1, provinceId: 1, drawDate: 1 });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
