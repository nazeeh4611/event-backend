import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  hosterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hoster',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
    required: true
  },
  whatsapp: {
    type: String,
    default: ''
  },
  numberOfTickets: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  ticketType: {
    type: String,
    default: 'regular'
  },
  unitPrice: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 10
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    default: function() {
      return this.totalAmount - this.commissionAmount;
    }
  },
  specialRequirements: {
    type: String
  },
  reservationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'bank_transfer', 'paypal', 'stripe', 'other'],
    default: 'card'
  },
  paymentId: String,
  paymentDate: Date,
  transactionId: String,
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkInTime: Date,
  qrCode: String,
  qrCodeUrl: String,
  tickets: [{
    ticketNumber: String,
    qrCode: String,
    checkedIn: {
      type: Boolean,
      default: false
    },
    checkInTime: Date
  }],
  cancellationReason: String,
  refundAmount: Number,
  refundDate: Date,
  notes: String
}, { timestamps: true });

reservationSchema.pre('save', function() {
  this.netAmount = this.totalAmount - this.commissionAmount;
});

reservationSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update.totalAmount !== undefined || update.commissionAmount !== undefined) {
    const totalAmount = update.totalAmount || update.$set?.totalAmount || 0;
    const commissionAmount = update.commissionAmount || update.$set?.commissionAmount || 0;
    update.netAmount = totalAmount - commissionAmount;
    if (update.$set) update.$set.netAmount = totalAmount - commissionAmount;
  }
});

reservationSchema.index({ eventId: 1, status: 1 });
reservationSchema.index({ hosterId: 1, reservationDate: -1 });
reservationSchema.index({ email: 1, phone: 1 });
reservationSchema.index({ paymentStatus: 1, status: 1 });

export default mongoose.model('Reservation', reservationSchema);