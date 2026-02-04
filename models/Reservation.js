import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  fullName: {
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
  numberOfTickets: {
    type: Number,
    required: true,
    min: 1
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
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  }
});

export default mongoose.model('Reservation', reservationSchema);
