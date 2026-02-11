import Hoster from '../models/Hoster.js';
import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import GuestList from '../models/GuestList.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cloudinary from '../Config/cloudinary.js';

const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'eventra_events',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(file.buffer);
  });
};

export const registerHoster = async (req, res) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      password,
      address,
      taxNumber,
      website
    } = req.body;
    const existingHoster = await Hoster.findOne({ email });
    if (existingHoster) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    const hoster = new Hoster({
      companyName,
      contactPerson,
      email,
      phone,
      password,
      address: address ? JSON.parse(address) : {},
      taxNumber,
      website,
      status: 'pending'
    });
    await hoster.save();
    res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for admin approval.',
      hoster: {
        id: hoster._id,
        companyName: hoster.companyName,
        email: hoster.email,
        status: hoster.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const loginHoster = async (req, res) => {
  try {
    const { email, password } = req.body;
    const hoster = await Hoster.findOne({ email });
    if (!hoster) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    const isMatch = await hoster.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    if (hoster.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: `Account is ${hoster.status}. Contact admin for approval.`
      });
    }
    if (!hoster.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }
    hoster.lastLogin = new Date();
    await hoster.save();
    const token = jwt.sign(
      { id: hoster._id, role: 'hoster', type: 'hoster' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      success: true,
      token,
      hoster: {
        id: hoster._id,
        companyName: hoster.companyName,
        contactPerson: hoster.contactPerson,
        email: hoster.email,
        status: hoster.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHosterDashboard = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const totalEvents = await Event.countDocuments({ hosterId });
    const activeEvents = await Event.countDocuments({ 
      hosterId, 
      status: { $in: ['live', 'upcoming', 'ongoing'] },
      date: { $gte: today }
    });
    const totalReservations = await Reservation.countDocuments({ hosterId });
    const pendingReservations = await Reservation.countDocuments({ 
      hosterId, 
      status: 'pending' 
    });
    const totalGuests = await GuestList.countDocuments({ hosterId });
    const confirmedGuests = await GuestList.countDocuments({ 
      hosterId, 
      rsvpStatus: 'confirmed' 
    });
    const monthlyStats = await Reservation.aggregate([
      {
        $match: {
          hosterId: hosterId,
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
          netRevenue: { $sum: { $subtract: ['$totalAmount', '$commissionAmount'] } }
        }
      }
    ]);
    const recentEvents = await Event.find({ hosterId })
      .sort({ createdAt: -1 })
      .limit(5);
    const recentReservations = await Reservation.find({ hosterId })
      .populate('eventId', 'title')
      .sort({ reservationDate: -1 })
      .limit(10);
    res.json({
      success: true,
      stats: {
        totalEvents,
        activeEvents,
        totalReservations,
        pendingReservations,
        totalGuests,
        confirmedGuests,
        monthlyRevenue: monthlyStats[0]?.totalRevenue || 0,
        monthlyCommission: monthlyStats[0]?.totalCommission || 0,
        monthlyNet: monthlyStats[0]?.netRevenue || 0
      },
      recentEvents,
      recentReservations
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const eventData = JSON.parse(JSON.stringify(req.body));
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }
    }
    const featuredImageIndex = parseInt(eventData.featuredImageIndex) || 0;
    eventData.hosterId = hosterId;
    eventData.images = imageUrls;
    eventData.featuredImage = imageUrls[featuredImageIndex] || imageUrls[0] || '';
    eventData.tags = eventData.tags ? eventData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    eventData.price = parseFloat(eventData.price);
    eventData.capacity = parseInt(eventData.capacity);
    const event = new Event(eventData);
    await event.save();
    res.status(201).json({ 
      success: true, 
      message: 'Event created successfully',
      event 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHosterEvents = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const query = { hosterId };
    if (status && status !== 'all') query.status = status;
    const events = await Event.find(query)
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

export const getEventById = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const event = await Event.findOne({ 
      _id: req.params.id, 
      hosterId 
    });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const eventId = req.params.id;
    const updates = JSON.parse(JSON.stringify(req.body));
    const event = await Event.findOne({ _id: eventId, hosterId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    const imageUrls = [];
    if (updates.existingImages) {
      const existingImages = Array.isArray(updates.existingImages) 
        ? updates.existingImages 
        : [updates.existingImages];
      imageUrls.push(...existingImages);
    }
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }
    }
    const featuredImageIndex = parseInt(updates.featuredImageIndex) || 0;
    updates.images = imageUrls;
    updates.featuredImage = imageUrls[featuredImageIndex] || imageUrls[0] || '';
    updates.tags = updates.tags ? updates.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    updates.price = parseFloat(updates.price);
    updates.capacity = parseInt(updates.capacity);
    delete updates.existingImages;
    delete updates.featuredImageIndex;
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      updates,
      { new: true, runValidators: true }
    );
    res.json({ 
      success: true, 
      message: 'Event updated successfully',
      event: updatedEvent 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const event = await Event.findOneAndDelete({ 
      _id: req.params.id, 
      hosterId 
    });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateEventStatus = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    const event = await Event.findOneAndUpdate(
      { _id: id, hosterId },
      { status },
      { new: true, runValidators: true }
    );
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    res.json({ 
      success: true, 
      message: `Event status updated to ${status}`,
      event 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHosterReservations = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const { eventId, status, page = 1, limit = 20 } = req.query;
    const query = { hosterId };
    if (eventId) query.eventId = eventId;
    if (status) query.status = status;
    const reservations = await Reservation.find(query)
      .populate('eventId', 'title date')
      .sort({ reservationDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Reservation.countDocuments(query);
    res.json({
      success: true,
      reservations,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateReservationStatus = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    const reservation = await Reservation.findOneAndUpdate(
      { _id: id, hosterId },
      { status },
      { new: true }
    ).populate('eventId');
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }
    res.json({ 
      success: true, 
      message: 'Reservation status updated',
      reservation 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHosterGuests = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const { eventId, rsvpStatus, checkedIn, page = 1, limit = 50 } = req.query;
    const query = { hosterId };
    if (eventId) query.eventId = eventId;
    if (rsvpStatus) query.rsvpStatus = rsvpStatus;
    if (checkedIn !== undefined) query.checkedIn = checkedIn === 'true';
    const guests = await GuestList.find(query)
      .populate('eventId', 'title date')
      .sort({ addedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await GuestList.countDocuments(query);
    res.json({
      success: true,
      guests,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addGuest = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const guestData = req.body;
    
    guestData.hosterId = hosterId;
    guestData.addedBy = 'hoster';
    
    if (guestData.numberOfGuests > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 guests allowed per phone number'
      });
    }
    
    const existingGuest = await GuestList.findOne({
      eventId: guestData.eventId,
      phone: guestData.phone
    });
    
    if (existingGuest) {
      return res.status(400).json({
        success: false,
        error: 'This phone number is already registered for this event'
      });
    }
    
    if (guestData.additionalGuests) {
      guestData.numberOfGuests = 1 + guestData.additionalGuests.length;
    }
    
    const guest = new GuestList(guestData);
    await guest.save();
    
    res.status(201).json({ success: true, guest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateGuest = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const { id } = req.params;
    const updates = req.body;
    const guest = await GuestList.findOneAndUpdate(
      { _id: id, hosterId },
      updates,
      { new: true }
    ).populate('eventId');
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }
    res.json({ success: true, guest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const checkInGuest = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const guest = await GuestList.findOneAndUpdate(
      { _id: req.params.id, hosterId },
      {
        checkedIn: true,
        checkInTime: new Date()
      },
      { new: true }
    );
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }
    res.json({ success: true, guest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteGuest = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const guest = await GuestList.findOneAndDelete({ 
      _id: req.params.id, 
      hosterId 
    });
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }
    res.json({
      success: true,
      message: 'Guest removed from list'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getHosterProfile = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const hoster = await Hoster.findById(hosterId).select('-password');
    if (!hoster) {
      return res.status(404).json({
        success: false,
        error: 'Hoster not found'
      });
    }
    res.json({ success: true, hoster });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateHosterProfile = async (req, res) => {
  try {
    const hosterId = req.user.id;
    const updates = req.body;
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }
    const hoster = await Hoster.findByIdAndUpdate(
      hosterId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    res.json({
      success: true,
      message: 'Profile updated successfully',
      hoster
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};