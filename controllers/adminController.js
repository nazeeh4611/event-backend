import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import GuestList from '../models/GuestList.js';
import bcrypt from 'bcryptjs';

const DEFAULT_ADMIN_EMAIL = 'info@eventra.com';
const DEFAULT_ADMIN_PASSWORD = 'event@eventra';

const setupDefaultAdmin = async () => {
  const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL });

  if (!existingAdmin) {
    const defaultAdmin = new Admin({
      username: 'admin',
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD, // ✅ plain here
      role: 'superadmin',
      isActive: true
    });

    await defaultAdmin.save();
    console.log('Default admin created');
  }
};


const registerAdmin = async (req, res) => {
  try {

    const { username, email, password, role } = req.body;

    if (!req.admin || req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can register new admins'
      });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    if (email === DEFAULT_ADMIN_EMAIL) {
      return res.status(400).json({
        success: false,
        error: 'Cannot use default admin email'
      });
    }

    const admin = new Admin({ 
      username, 
      email, 
      password, 
      role: role || 'admin',
      isActive: true 
    });
    
    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {

    console.log("is herree")
    const { email, password } = req.body;

    console.log("first",email,password)
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      console.log("admin not found")
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isMatch = await admin.comparePassword(password);
    console.log("its matched",isMatch)
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const totalEvents = await Event.countDocuments();

    const upcomingEvents = await Event.countDocuments({
      date: { $gte: today },
      status: 'upcoming'
    });

    const totalReservations = await Reservation.countDocuments();

    const pendingReservations = await Reservation.countDocuments({
      status: 'pending'
    });

    const totalGuests = await GuestList.countDocuments();

    const confirmedGuests = await GuestList.countDocuments({
      rsvpStatus: 'confirmed'
    });

    const monthlyEvents = await Event.countDocuments({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const monthlyRevenue = await Reservation.aggregate([
      {
        $match: {
          reservationDate: { $gte: startOfMonth, $lte: endOfMonth },
          status: 'confirmed'
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $multiply: ['$numberOfTickets', '$event.price'] }
          }
        }
      }
    ]);

    const recentEvents = await Event.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const recentReservations = await Reservation.find()
      .populate('eventId', 'title')
      .sort({ reservationDate: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        totalReservations,
        pendingReservations,
        totalGuests,
        confirmedGuests,
        monthlyEvents,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
      },
      recentEvents,
      recentReservations
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can view all admins'
      });
    }

    const admins = await Admin.find({}, '-password');
    
    res.json({
      success: true,
      admins
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.admin.role !== 'superadmin' && req.admin._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this admin'
      });
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    res.json({
      success: true,
      admin
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can delete admins'
      });
    }

    const adminToDelete = await Admin.findById(id);
    
    if (!adminToDelete) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    if (adminToDelete.email === DEFAULT_ADMIN_EMAIL) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete default admin'
      });
    }

    await Admin.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export {
  setupDefaultAdmin,
  registerAdmin,
  loginAdmin,
  getDashboardStats,
  getAllAdmins,
  updateAdmin,
  deleteAdmin
};