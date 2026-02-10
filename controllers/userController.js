import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import Hoster from '../models/Hoster.js';

export const getPublicEvents = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, sort = 'date' } = req.query;
    
    const query = { 
      status: 'live',
      date: { $gte: new Date() }
    };
    
    if (category) query.category = category;
    
    const events = await Event.find(query)
      .populate('hosterId', 'companyName')
      .sort({ [sort]: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(query);
    
    const categories = await Event.distinct('category', { status: 'live' });
    
    res.json({
      success: true,
      events,
      categories,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getEventDetails = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('hosterId', 'companyName contactPerson email phone website');
    
    if (!event || event.status !== 'live') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    const relatedEvents = await Event.find({
      _id: { $ne: event._id },
      category: event.category,
      status: 'live',
      date: { $gte: new Date() }
    })
      .populate('hosterId', 'companyName')
      .limit(4);
    
    const availableSeats = event.capacity - event.bookedSeats;
    
    res.json({ 
      success: true, 
      event,
      relatedEvents,
      availableSeats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createReservation = async (req, res) => {
  try {
    const reservationData = req.body;
    
    const event = await Event.findById(reservationData.eventId);
    if (!event || event.status !== 'live') {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    const availableSeats = event.capacity - event.bookedSeats;
    if (reservationData.numberOfTickets > availableSeats) {
      return res.status(400).json({
        success: false,
        error: `Only ${availableSeats} seats available`
      });
    }
    
    const totalAmount = reservationData.numberOfTickets * event.price;
    const commissionAmount = totalAmount * (event.commission.rate / 100);
    
    const reservation = new Reservation({
      ...reservationData,
      eventId: event._id,
      hosterId: event.hosterId,
      totalAmount,
      commissionAmount,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    await reservation.save();
    
    event.bookedSeats += reservationData.numberOfTickets;
    await event.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Reservation created successfully',
      reservation: {
        id: reservation._id,
        eventTitle: event.title,
        date: event.date,
        venue: event.venue,
        numberOfTickets: reservation.numberOfTickets,
        totalAmount: reservation.totalAmount,
        status: reservation.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCarouselEvents = async (req, res) => {
  try {
    const events = await Event.find({ 
      isFeatured: true, 
      status: 'live',
      date: { $gte: new Date() }
    })
      .populate('hosterId', 'companyName')
      .sort({ carouselPosition: 1, date: 1 })
      .limit(8);
    
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const searchEvents = async (req, res) => {
  try {
    const { q, category, date, location, page = 1, limit = 12 } = req.query;
    
    const query = { status: 'live' };
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (date) query.date = new Date(date);
    
    const events = await Event.find(query)
      .populate('hosterId', 'companyName')
      .sort({ date: 1 })
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

export const getEventsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12 } = req.query;
    
    const events = await Event.find({ 
      category,
      status: 'live',
      date: { $gte: new Date() }
    })
      .populate('hosterId', 'companyName')
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments({ category, status: 'live' });
    
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

export const getFeaturedEvents = async (req, res) => {
  try {
    const events = await Event.find({ 
      isFeatured: true,
      status: 'live',
      date: { $gte: new Date() }
    })
      .populate('hosterId', 'companyName')
      .sort({ date: 1 })
      .limit(6);
    
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};