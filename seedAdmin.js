import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_ADMIN_EMAIL = 'info@eventra.com';
const DEFAULT_ADMIN_PASSWORD = 'event@eventra';

const seedDefaultAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const Admin = mongoose.model('Admin', {
      username: String,
      email: String,
      password: String,
      role: String,
      isActive: Boolean,
      createdAt: Date
    });

    const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      
      const defaultAdmin = new Admin({
        username: 'admin',
        email: DEFAULT_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'superadmin',
        isActive: true,
        createdAt: new Date()
      });

      await defaultAdmin.save();
      console.log('✅ Default admin created successfully');
      console.log(`📧 Email: ${DEFAULT_ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log('🔐 Role: superadmin');
    } else {
      console.log('⚠️  Default admin already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding default admin:', error);
    process.exit(1);
  }
};

seedDefaultAdmin();