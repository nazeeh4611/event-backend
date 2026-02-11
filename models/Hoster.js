import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const hosterSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  whatsappNumber: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  taxNumber: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  documents: [{
    type: {
      type: String,
      enum: ['business_license', 'tax_certificate', 'id_proof', 'other']
    },
    url: String,
    name: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  rejectionReason: String,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  commissionRate: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  totalEvents: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalCommission: {
    type: Number,
    default: 0
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  payoutMethod: {
    type: {
      type: String,
      enum: ['bank', 'paypal', 'stripe', 'other']
    },
    details: mongoose.Schema.Types.Mixed
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

hosterSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

hosterSchema.pre('findOneAndUpdate', async function() {
  const update = this.getUpdate();
  if (update.password || (update.$set && update.$set.password)) {
    const password = update.password || update.$set.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    if (update.password) update.password = hashedPassword;
    if (update.$set && update.$set.password) update.$set.password = hashedPassword;
  }
});

hosterSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

hosterSchema.index({ email: 1 }, { unique: true });
hosterSchema.index({ status: 1, createdAt: -1 });
hosterSchema.index({ companyName: 'text', contactPerson: 'text' });

const Hoster = mongoose.model('Hoster', hosterSchema);
export default Hoster;