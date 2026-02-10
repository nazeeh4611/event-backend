import mongoose from 'mongoose';

const guestListSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  hosterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hoster'
  },
  guestName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  company: String,
  position: String,
  plusOnes: {
    type: Number,
    default: 0
  },
  invitationSent: {
    type: Boolean,
    default: false
  },
  rsvpStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'declined'],
    default: 'pending'
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkInTime: {
    type: Date
  },
  notes: {
    type: String
  },
  addedBy: {
    type: String,
    enum: ['admin', 'hoster', 'user'],
    default: 'hoster'
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('GuestList', guestListSchema);