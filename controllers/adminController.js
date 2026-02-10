import Admin from '../models/Admin.js';
import Hoster from '../models/Hoster.js';
import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import GuestList from '../models/GuestList.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const DEFAULT_ADMIN_EMAIL = 'admin@eventra.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

export const setupDefaultAdmin = async () => {
  const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    const defaultAdmin = new Admin({
      username: 'admin',
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'superadmin',
      isActive: true
    });
    await defaultAdmin.save();
    console.log('Default admin created');
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    const isMatch = await admin.comparePassword(password);
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
      { id: admin._id, role: 'admin', type: 'admin' },
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

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const totalEvents = await Event.countDocuments();
    const totalHosters = await Hoster.countDocuments();
    const pendingHosters = await Hoster.countDocuments({ status: 'pending' });
    const totalReservations = await Reservation.countDocuments();
    const pendingReservations = await Reservation.countDocuments({ status: 'pending' });
    const totalGuests = await GuestList.countDocuments();
    
    const monthlyRevenue = await Reservation.aggregate([
      {
        $match: {
          reservationDate: { $gte: startOfMonth, $lte: endOfMonth },
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);
    
    const recentEvents = await Event.find()
      .populate('hosterId', 'companyName')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const pendingEvents = await Event.find({ status: 'pending' })
      .populate('hosterId', 'companyName contactPerson')
      .limit(5);
    
    const recentHosters = await Hoster.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      success: true,
      stats: {
        totalEvents,
        totalHosters,
        pendingHosters,
        totalReservations,
        pendingReservations,
        totalGuests,
        monthlyRevenue: monthlyRevenue[0]?.totalRevenue || 0,
        monthlyCommission: monthlyRevenue[0]?.totalCommission || 0
      },
      recentEvents,
      pendingEvents,
      recentHosters
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllHosters = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    
    const hosters = await Hoster.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Hoster.countDocuments(query);
    
    res.json({
      success: true,
      hosters,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHosterById = async (req, res) => {
  try {
    const hoster = await Hoster.findById(req.params.id).select('-password');
    if (!hoster) {
      return res.status(404).json({
        success: false,
        error: 'Hoster not found'
      });
    }
    const hosterEvents = await Event.find({ hosterId: hoster._id });
    const hosterStats = await Reservation.aggregate([
      { $match: { hosterId: hoster._id } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalReservations: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      hoster,
      events: hosterEvents,
      stats: hosterStats[0] || {
        totalRevenue: 0,
        totalCommission: 0,
        totalReservations: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


export const updateHosterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ['pending', 'approved', 'rejected', 'suspended'];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    const hoster = await Hoster.findById(id);

    if (!hoster) {
      return res.status(404).json({
        success: false,
        error: 'Hoster not found'
      });
    }

    console.log(hoster);
    console.log("first");

    hoster.status = status;

    await hoster.save();

    console.log("saved");

    res.json({
      success: true,
      message: `Hoster ${status} successfully`,
      hoster
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


export const getAllEvents = async (req, res) => {
  try {
    const { status, hosterId, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (hosterId) query.hosterId = hosterId;
    
    const events = await Event.find(query)
      .populate('hosterId', 'companyName contactPerson')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(query);
    
    res.json({
      success: true,
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    event.status = status;
    if (adminNotes) event.adminNotes = adminNotes;
    await event.save();
    
    res.json({
      success: true,
      message: `Event ${status} successfully`,
      event
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getEventReservations = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { eventId };
    if (status) query.status = status;
    
    const reservations = await Reservation.find(query)
      .populate('eventId', 'title date')
      .sort({ reservationDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Reservation.countDocuments(query);
    
    const stats = await Reservation.aggregate([
      { $match: { eventId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      reservations,
      stats,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getEventGuests = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rsvpStatus, checkedIn, page = 1, limit = 50 } = req.query;
    
    const query = { eventId };
    if (rsvpStatus) query.rsvpStatus = rsvpStatus;
    if (checkedIn !== undefined) query.checkedIn = checkedIn === 'true';
    
    const guests = await GuestList.find(query)
      .populate('eventId', 'title date')
      .sort({ addedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await GuestList.countDocuments(query);
    
    const stats = {
      total: await GuestList.countDocuments({ eventId }),
      confirmed: await GuestList.countDocuments({ eventId, rsvpStatus: 'confirmed' }),
      checkedIn: await GuestList.countDocuments({ eventId, checkedIn: true })
    };
    
    res.json({
      success: true,
      guests,
      stats,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCarouselEvents = async (req, res) => {
  try {
    const events = await Event.find({ isFeatured: true, status: 'approved' })
      .populate('hosterId', 'companyName')
      .sort({ carouselPosition: 1, date: 1 })
      .limit(10);
    
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateCarouselOrder = async (req, res) => {
  try {
    const { order } = req.body;
    const updatePromises = order.map((eventId, index) => {
      return Event.findByIdAndUpdate(
        eventId,
        { carouselPosition: index, isFeatured: true },
        { new: true }
      );
    });
    await Promise.all(updatePromises);
    res.json({
      success: true,
      message: 'Carousel order updated'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};