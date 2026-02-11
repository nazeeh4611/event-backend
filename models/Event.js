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
    maxlength: 200
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
  subCategory: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
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
  contactWhatsapp: {
    type: String,
    default: ''
  },
  website: String,
  facebook: String,
  instagram: String,
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
  availableSeats: {
    type: Number,
    default: function() {
      return this.capacity - this.bookedSeats;
    }
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'live', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'pending'
  },
  adminApproval: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
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
  virtualPlatform: String,
  requirements: String,
  terms: String,
  refundPolicy: String,
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

eventSchema.pre('save', function() {
  this.availableSeats = this.capacity - this.bookedSeats;
});

eventSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update.capacity !== undefined || update.bookedSeats !== undefined) {
    const capacity = update.capacity || update.$set?.capacity;
    const bookedSeats = update.bookedSeats || update.$set?.bookedSeats || 0;
    if (capacity !== undefined) {
      update.availableSeats = capacity - bookedSeats;
      if (update.$set) update.$set.availableSeats = capacity - bookedSeats;
    }
  }
});

eventSchema.index({ hosterId: 1, status: 1, date: -1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ date: 1, status: 1 });

export default mongoose.model('Event', eventSchema);