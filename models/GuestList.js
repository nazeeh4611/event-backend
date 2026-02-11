import mongoose from 'mongoose';

const guestListSchema = new mongoose.Schema({
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
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  guestName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: true
  },
  whatsapp: {
    type: String,
    default: ''
  },
  additionalGuests: [{
    name: String,
    email: String,
    phone: String
  }],
  numberOfGuests: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  rsvpStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'declined', 'attended'],
    default: 'pending'
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkInTime: Date,
  checkInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hoster'
  },
  ticketType: {
    type: String,
    default: 'regular'
  },
  ticketPrice: {
    type: Number,
    default: 0
  },
  specialRequests: String,
  notes: String,
  addedBy: {
    type: String,
    enum: ['hoster', 'admin', 'customer', 'system'],
    default: 'hoster'
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

guestListSchema.index({ eventId: 1, phone: 1 }, { unique: true });
guestListSchema.index({ eventId: 1, email: 1 });
guestListSchema.index({ hosterId: 1, eventId: 1 });
guestListSchema.index({ rsvpStatus: 1, checkedIn: 1 });

export default mongoose.model('GuestList', guestListSchema);