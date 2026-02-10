import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 150
  },
  venue: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  endDate: Date,
  endTime: String,
  category: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String
  }],
  featuredImage: {
    type: String
  },
  hosterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hoster',
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  website: String,
  tags: [{
    type: String
  }],
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  bookedSeats: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'live', 'completed', 'cancelled'],
    default: 'draft'
  },
  carouselPosition: {
    type: Number,
    default: 0
  },
  commission: {
    rate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  eventType: {
    type: String,
    enum: ['physical', 'virtual', 'hybrid'],
    default: 'physical'
  },
  virtualLink: String,
  requirements: String,
  terms: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

eventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Event', eventSchema);