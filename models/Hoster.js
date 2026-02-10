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
  password: {
    type: String,
    required: true
  },

  address: {
    street: String,
    city: String,
    country: String
  },

  taxNumber: String,
  website: String,

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },

  documents: [{
    type: {
      type: String
    },
    url: String,
    name: String
  }],

  notes: String,

  lastLogin: Date,

  isActive: {
    type: Boolean,
    default: true
  },

  commissionRate: {
    type: Number,
    default: 10
  },

  totalEvents: {
    type: Number,
    default: 0
  },

  totalRevenue: {
    type: Number,
    default: 0
  }

}, { timestamps: true });


// ✅ FIXED pre-save hook
hosterSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});



// ✅ password compare method
hosterSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};


const Hoster = mongoose.model('Hoster', hosterSchema);
export default Hoster;
