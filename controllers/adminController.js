import Admin from '../models/Admin.js';
import Hoster from '../models/Hoster.js';
import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import GuestList from '../models/GuestList.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const DEFAULT_ADMIN_EMAIL = 'admin@eventra.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

// ==================== ADMIN SETUP ====================
export const setupDefaultAdmin = async () => {
  try {
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
      console.log('Default admin created successfully');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// ==================== AUTHENTICATION ====================
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

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
        error: 'Account is deactivated. Please contact super admin.'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate token
    const token = jwt.sign(
      { 
        id: admin._id, 
        role: admin.role, 
        type: 'admin',
        email: admin.email 
      },
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
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An error occurred during login. Please try again.' 
    });
  }
};

// ==================== DASHBOARD ====================
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Get counts
    const totalEvents = await Event.countDocuments();
    const liveEvents = await Event.countDocuments({ status: 'approved' });
    const pendingEvents = await Event.countDocuments({ status: 'pending' });
    
    const totalHosters = await Hoster.countDocuments();
    const pendingHosters = await Hoster.countDocuments({ status: 'pending' });
    const approvedHosters = await Hoster.countDocuments({ status: 'approved' });
    
    const totalReservations = await Reservation.countDocuments();
    const confirmedReservations = await Reservation.countDocuments({ status: 'confirmed' });
    const pendingReservations = await Reservation.countDocuments({ status: 'pending' });
    
    const totalGuests = await GuestList.countDocuments();
    const checkedInGuests = await GuestList.countDocuments({ checkedIn: true });
    
    // Calculate revenue
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
          totalCommission: { $sum: '$commissionAmount' },
          totalReservations: { $sum: 1 }
        }
      }
    ]);

    // Get total revenue all time
    const totalRevenue = await Reservation.aggregate([
      {
        $match: {
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' }
        }
      }
    ]);
    
    // Recent data
    const recentEvents = await Event.find()
      .populate('hosterId', 'companyName email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const eventsPendingApproval = await Event.find({ status: 'pending' })
      .populate('hosterId', 'companyName contactPerson email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const hostersPendingApproval = await Hoster.find({ status: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const recentReservations = await Reservation.find()
      .populate('eventId', 'title date')
      .populate('fullName email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      success: true,
      stats: {
        // Events
        totalEvents,
        liveEvents,
        pendingEvents,
        
        // Hosters
        totalHosters,
        pendingHosters,
        approvedHosters,
        
        // Reservations
        totalReservations,
        confirmedReservations,
        pendingReservations,
        
        // Guests
        totalGuests,
        checkedInGuests,
        
        // Revenue
        monthlyRevenue: monthlyRevenue[0]?.totalRevenue || 0,
        monthlyCommission: monthlyRevenue[0]?.totalCommission || 0,
        monthlyReservations: monthlyRevenue[0]?.totalReservations || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCommission: totalRevenue[0]?.totalCommission || 0
      },
      recentEvents,
      eventsPendingApproval,
      hostersPendingApproval,
      recentReservations
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== HOSTER MANAGEMENT ====================
export const getAllHosters = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const hosters = await Hoster.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Hoster.countDocuments(query);
    
    // Get event counts for each hoster
    const hosterIds = hosters.map(h => h._id);
    const eventCounts = await Event.aggregate([
      { $match: { hosterId: { $in: hosterIds } } },
      { $group: { _id: '$hosterId', count: { $sum: 1 } } }
    ]);
    
    const hostersWithCounts = hosters.map(hoster => {
      const countData = eventCounts.find(ec => ec._id.toString() === hoster._id.toString());
      return {
        ...hoster.toObject(),
        eventsCount: countData?.count || 0
      };
    });
    
    res.json({
      success: true,
      hosters: hostersWithCounts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get all hosters error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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
    
    const hosterEvents = await Event.find({ hosterId: hoster._id })
      .sort({ createdAt: -1 });
    
    const hosterStats = await Reservation.aggregate([
      { $match: { hosterId: hoster._id } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalReservations: { $sum: 1 },
          confirmedReservations: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const monthlyStats = await Reservation.aggregate([
      {
        $match: {
          hosterId: hoster._id,
          reservationDate: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          reservations: { $sum: 1 }
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
        totalReservations: 0,
        confirmedReservations: 0
      },
      monthlyStats: monthlyStats[0] || {
        revenue: 0,
        reservations: 0
      }
    });
  } catch (error) {
    console.error('Get hoster by ID error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const updateHosterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

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

    hoster.status = status;
    if (reason) hoster.adminNotes = reason;
    
    await hoster.save();

    res.json({
      success: true,
      message: `Hoster ${status} successfully`,
      hoster: {
        id: hoster._id,
        companyName: hoster.companyName,
        status: hoster.status,
        email: hoster.email
      }
    });

  } catch (error) {
    console.error('Update hoster status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== EVENT MANAGEMENT ====================
export const getAllEvents = async (req, res) => {
  try {
    const { status, hosterId, search, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (status) {
      const statusArray = status.split(',');
      if (statusArray.length > 1) {
        query.status = { $in: statusArray };
      } else {
        query.status = status;
      }
    }
    
    if (hosterId) query.hosterId = hosterId;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const events = await Event.find(query)
      .populate('hosterId', 'companyName contactPerson email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(query);
    
    // Get reservation counts for each event
    const eventIds = events.map(e => e._id);
    const reservationCounts = await Reservation.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { 
        $group: { 
          _id: '$eventId', 
          total: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          }
        } 
      }
    ]);
    
    const eventsWithCounts = events.map(event => {
      const countData = reservationCounts.find(rc => rc._id.toString() === event._id.toString());
      return {
        ...event.toObject(),
        reservationsCount: countData?.total || 0,
        confirmedReservations: countData?.confirmed || 0
      };
    });
    
    res.json({
      success: true,
      events: eventsWithCounts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get all events error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const allowedStatus = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
    
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
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
    console.error('Update event status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== RESERVATION MANAGEMENT ====================
export const getEventReservations = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { eventId };
    if (status) query.status = status;
    
    const reservations = await Reservation.find(query)
      .populate('eventId', 'title date venue')
      .populate('fullname email phone')
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
    
    // Get ticket type breakdown
    const ticketBreakdown = await Reservation.aggregate([
      { $match: { eventId } },
      { $unwind: '$tickets' },
      {
        $group: {
          _id: '$tickets.ticketTypeId',
          quantity: { $sum: '$tickets.quantity' },
          revenue: { $sum: '$tickets.price' }
        }
      }
    ]);
    
    res.json({
      success: true,
      reservations,
      stats,
      ticketBreakdown,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get event reservations error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== GUEST MANAGEMENT ====================
export const getEventGuests = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rsvpStatus, checkedIn, search, page = 1, limit = 50 } = req.query;
    
    const query = { eventId };
    if (rsvpStatus) query.rsvpStatus = rsvpStatus;
    if (checkedIn !== undefined) query.checkedIn = checkedIn === 'true';
    
    if (search) {
      query.$or = [
        { guestName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const guests = await GuestList.find(query)
      .populate('eventId', 'title date venue')
      .sort({ addedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await GuestList.countDocuments(query);
    
    const stats = {
      total: await GuestList.countDocuments({ eventId }),
      confirmed: await GuestList.countDocuments({ eventId, rsvpStatus: 'confirmed' }),
      pending: await GuestList.countDocuments({ eventId, rsvpStatus: 'pending' }),
      declined: await GuestList.countDocuments({ eventId, rsvpStatus: 'declined' }),
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
    console.error('Get event guests error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== CAROUSEL MANAGEMENT ====================
export const getCarouselEvents = async (req, res) => {
  try {
    const events = await Event.find({ 
      isFeatured: true, 
    })
      .populate('hosterId', 'companyName email phone')
      .sort({ carouselPosition: 1, date: 1 })
      .limit(10);
    
    res.json({ 
      success: true, 
      events 
    });
  } catch (error) {
    console.error('Get carousel events error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const addToCarousel = async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required'
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if event is approved
    if (event.status !== 'upcoming' && event.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        error: 'Only upcoming or ongoing events can be featured in carousel'
      });
    }
    
    console.log("first")


    // Check if event date is in the future
    const eventDate = new Date(event.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (eventDate < now) {
      return res.status(400).json({
        success: false,
        error: 'Cannot add past events to carousel'
      });
    }


    // Check if already in carousel
    if (event.isFeatured) {
      return res.status(409).json({
        success: false,
        error: 'Event already in carousel'
      });
    }

    // Check carousel limit (max 10)
    const carouselCount = await Event.countDocuments({ isFeatured: true });
    if (carouselCount >= 10) {
      return res.status(400).json({
        success: false,
        error: 'Carousel already has maximum 10 events. Please remove one first.'
      });
    }

    // Get current max carousel position
    const maxPositionEvent = await Event.findOne({ isFeatured: true })
      .sort({ carouselPosition: -1 });
    
    const newPosition = (maxPositionEvent?.carouselPosition || 0) + 1;

    // Update event
    event.isFeatured = true;
    event.carouselPosition = newPosition;
    event.featuredAt = new Date();
    await event.save();

    // Get updated carousel events
    const updatedCarousel = await Event.find({ isFeatured: true, status: 'approved' })
      .populate('hosterId', 'companyName')
      .sort({ carouselPosition: 1, date: 1 })
      .limit(10);

    res.json({
      success: true,
      message: 'Event added to carousel successfully',
      events: updatedCarousel
    });
  } catch (error) {
    console.error('Add to carousel error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const removeFromCarousel = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: 'Event ID is required'
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Check if event is in carousel
    if (!event.isFeatured) {
      return res.status(404).json({
        success: false,
        error: 'Event not found in carousel'
      });
    }

    // Remove from carousel
    event.isFeatured = false;
    event.carouselPosition = null;
    event.featuredAt = null;
    await event.save();

    // Reorder remaining carousel events
    const remainingEvents = await Event.find({ 
      isFeatured: true, 
      status: 'approved' 
    }).sort({ carouselPosition: 1 });

    // Update positions to be sequential
    const updatePromises = remainingEvents.map((e, index) => {
      e.carouselPosition = index + 1;
      return e.save();
    });

    await Promise.all(updatePromises);

    // Get updated carousel events
    const updatedCarousel = await Event.find({ isFeatured: true, status: 'approved' })
      .populate('hosterId', 'companyName')
      .sort({ carouselPosition: 1, date: 1 })
      .limit(10);

    res.json({
      success: true,
      message: 'Event removed from carousel successfully',
      events: updatedCarousel
    });
  } catch (error) {
    console.error('Remove from carousel error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const updateCarouselOrder = async (req, res) => {
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order data format'
      });
    }

    // Validate that all events exist and are featured
    for (const item of events) {
      if (!item.eventId || !item.position) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have eventId and position'
        });
      }

      const event = await Event.findById(item.eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: `Event ${item.eventId} not found`
        });
      }
      
      if (!event.isFeatured) {
        return res.status(400).json({
          success: false,
          error: `Event ${item.eventId} is not in carousel`
        });
      }
    }

    // Update positions
    const updatePromises = events.map((item) => {
      return Event.findByIdAndUpdate(
        item.eventId,
        { 
          carouselPosition: item.position,
          isFeatured: true 
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    // Get updated carousel events
    const updatedCarousel = await Event.find({ isFeatured: true, status: 'approved' })
      .populate('hosterId', 'companyName')
      .sort({ carouselPosition: 1, date: 1 })
      .limit(10);

    res.json({
      success: true,
      message: 'Carousel order updated successfully',
      events: updatedCarousel
    });
  } catch (error) {
    console.error('Update carousel order error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// ==================== BULK OPERATIONS ====================
export const bulkUpdateEvents = async (req, res) => {
  try {
    const { eventIds, action, data } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Event IDs are required'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    let updateData = {};

    switch (action) {
      case 'approve':
        updateData = { status: 'approved' };
        break;
      case 'reject':
        updateData = { status: 'rejected', adminNotes: data?.reason };
        break;
      case 'addToCarousel':
        // Get current max position
        const maxPosition = await Event.findOne({ isFeatured: true })
          .sort({ carouselPosition: -1 });
        let position = (maxPosition?.carouselPosition || 0) + 1;
        
        // Update each event
        for (const eventId of eventIds) {
          await Event.findByIdAndUpdate(eventId, {
            isFeatured: true,
            carouselPosition: position,
            featuredAt: new Date()
          });
          position++;
        }
        
        res.json({
          success: true,
          message: `${eventIds.length} events added to carousel successfully`
        });
        return;
        
      case 'removeFromCarousel':
        await Event.updateMany(
          { _id: { $in: eventIds } },
          { 
            isFeatured: false, 
            carouselPosition: null,
            featuredAt: null
          }
        );
        
        // Reorder remaining carousel events
        const remainingEvents = await Event.find({ 
          isFeatured: true, 
          status: 'approved' 
        }).sort({ carouselPosition: 1 });
        
        const reorderPromises = remainingEvents.map((e, index) => {
          e.carouselPosition = index + 1;
          return e.save();
        });
        
        await Promise.all(reorderPromises);
        
        res.json({
          success: true,
          message: `${eventIds.length} events removed from carousel successfully`
        });
        return;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
    }

    await Event.updateMany(
      { _id: { $in: eventIds } },
      updateData
    );

    res.json({
      success: true,
      message: `${eventIds.length} events updated successfully`
    });
  } catch (error) {
    console.error('Bulk update events error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  setupDefaultAdmin,
  loginAdmin,
  getDashboardStats,
  getAllHosters,
  getHosterById,
  updateHosterStatus,
  getAllEvents,
  updateEventStatus,
  getEventReservations,
  getEventGuests,
  getCarouselEvents,
  addToCarousel,
  removeFromCarousel,
  updateCarouselOrder,
  bulkUpdateEvents
};