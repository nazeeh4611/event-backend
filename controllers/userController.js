import Event from '../models/Event.js';
import Reservation from '../models/Reservation.js';
import GuestList from '../models/GuestList.js';
import Hoster from '../models/Hoster.js';

export const getPublicEvents = async (req, res) => {
  try {

    console.log("reachh")
    const { page = 1, limit = 12, category, sort = 'date' } = req.query;
    const query = {
      status: { $in: ['live', 'upcoming', 'ongoing'] },
      date: { $gte: new Date() }
    };
    
    if (category) query.category = category;
    
    const events = await Event.find(query)
      .populate('hosterId', 'companyName contactPerson phone whatsappNumber')
      .sort({ [sort]: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(query);
    const categories = await Event.distinct('category', { status: { $in: ['live', 'upcoming','ongoing'] } });
    
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
      .populate('hosterId', 'companyName contactPerson email phone whatsappNumber website socialMedia');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    event.views = (event.views || 0) + 1;
    await event.save();
    
    const relatedEvents = await Event.find({
      _id: { $ne: event._id },
      category: event.category,
      status: { $in: ['live', 'upcoming','ongoing'] },
      date: { $gte: new Date() }
    })
      .populate('hosterId', 'companyName')
      .limit(4);
    
    const availableSeats = (event.capacity || 0) - (event.bookedSeats || 0);
    
    res.json({ 
      success: true, 
      event,
      relatedEvents,
      availableSeats: Math.max(0, availableSeats)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createReservation = async (req, res) => {
  try {
    const { 
      eventId, 
      fullName, 
      email, 
      phone, 
      numberOfTickets, 
      specialRequirements,
      address,
      city,
      country,
      paymentMethod,
      ticketType,
      hearAboutEvent
    } = req.body;
    
    const event = await Event.findById(eventId).populate('hosterId');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (!['live', 'upcoming','ongoing'].includes(event.status)) {
      return res.status(400).json({
        success: false,
        error: 'Event is not available for booking'
      });
    }
    
    const availableSeats = (event.capacity || 0) - (event.bookedSeats || 0);
    
    if (numberOfTickets > availableSeats) {
      return res.status(400).json({
        success: false,
        error: `Only ${availableSeats} seats available`
      });
    }
    
    const unitPrice = event.price || 0;
    const totalAmount = numberOfTickets * unitPrice;
    const commissionRate = event.commission?.rate || 10;
    const commissionAmount = (totalAmount * commissionRate) / 100;
    
    const reservation = new Reservation({
      eventId: event._id,
      hosterId: event.hosterId._id,
      fullName,
      email: email || '',
      phone,
      whatsapp: phone,
      numberOfTickets,
      unitPrice,
      totalAmount,
      commissionRate,
      commissionAmount,
      specialRequirements: specialRequirements || '',
      address: address || '',
      city: city || '',
      country: country || '',
      paymentMethod: paymentMethod || 'cash',
      ticketType: ticketType || 'regular',
      hearAboutEvent: hearAboutEvent || '',
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    await reservation.save();
    
    event.bookedSeats = (event.bookedSeats || 0) + numberOfTickets;
    await event.save();
    
    const guest = new GuestList({
      eventId: event._id,
      hosterId: event.hosterId._id,
      reservationId: reservation._id,
      guestName: fullName,
      email: email || '',
      phone: phone,
      whatsapp: phone,
      numberOfGuests: numberOfTickets,
      address: address || '',
      city: city || '',
      country: country || '',
      specialRequests: specialRequirements || '',
      rsvpStatus: 'confirmed',
      addedBy: 'customer'
    });
    
    await guest.save();
    
    const hosterWhatsapp = event.hosterId?.whatsappNumber || event.contactWhatsapp || '';
    let whatsappUrl = null;
    
    if (hosterWhatsapp) {
      let cleanWhatsapp = hosterWhatsapp.replace(/[\s+]/g, '');
      if (!cleanWhatsapp.startsWith('+')) {
        cleanWhatsapp = '+' + cleanWhatsapp;
      }
      
      const whatsappMessage = `🎟️ *NEW RESERVATION RECEIVED* 🎟️%0A%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `📋 *EVENT DETAILS*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🏷️ Title: ${event.title}%0A` +
        `📅 Date: ${new Date(event.date).toLocaleDateString()}%0A` +
        `⏰ Time: ${event.time || 'N/A'}%0A` +
        `📍 Venue: ${event.venue || 'N/A'}%0A` +
        `📍 Location: ${event.location || 'N/A'}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `👤 *CUSTOMER INFORMATION*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `👤 Name: ${fullName}%0A` +
        `📞 Phone: ${phone}%0A` +
        `📧 Email: ${email || 'Not provided'}%0A` +
        `🏠 Address: ${address || 'Not provided'}%0A` +
        `🏙️ City: ${city || 'Not provided'}%0A` +
        `🌍 Country: ${country || 'Not provided'}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🎫 *BOOKING DETAILS*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🎟️ Ticket Type: ${ticketType || 'Regular'}%0A` +
        `🔢 Quantity: ${numberOfTickets}%0A` +
        `💰 Unit Price: ${event.currency || 'AED'} ${unitPrice}%0A` +
        `💵 Total Amount: ${event.currency || 'AED'} ${totalAmount}%0A` +
        `💳 Payment Method: ${paymentMethod || 'Cash'}%0A` +
        `📢 Heard About Event: ${hearAboutEvent || 'Not specified'}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `📝 *ADDITIONAL INFORMATION*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `📌 Special Requirements: ${specialRequirements || 'None'}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🆔 *RESERVATION ID*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🔑 ID: ${reservation._id}%0A` +
        `📊 Status: Pending Confirmation%0A` +
        `📅 Booked On: ${new Date().toLocaleString()}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `✅ Please confirm this reservation as soon as possible.%0A` +
        `━━━━━━━━━━━━━━━━━━━━━`;
      
      whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${whatsappMessage}`;
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Reservation created successfully',
      reservation: {
        id: reservation._id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        venue: event.venue,
        location: event.location,
        numberOfTickets: reservation.numberOfTickets,
        totalAmount: reservation.totalAmount,
        currency: event.currency || 'AED',
        status: reservation.status,
        customerName: fullName,
        customerPhone: phone,
        customerEmail: email
      },
      hosterWhatsapp: hosterWhatsapp || null,
      whatsappUrl: whatsappUrl
    });
    
  } catch (error) {
    console.error('Reservation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getCarouselEvents = async (req, res) => {
  try {
    const events = await Event.find({ 
      isFeatured: true,
      status: { $in: ['live', 'upcoming','ongoing'] },
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
    const { q, category, date, location, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    
    const query = { 
      status: { $in: ['live', 'upcoming','ongoing'] },
      date: { $gte: new Date() }
    };
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { shortDescription: { $regex: q, $options: 'i' } },
        { venue: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }
    
    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (date) {
      const searchDate = new Date(date);
      query.date = {
        $gte: searchDate,
        $lt: new Date(searchDate.setDate(searchDate.getDate() + 1))
      };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    const events = await Event.find(query)
      .populate('hosterId', 'companyName')
      .sort({ date: 1, price: 1 })
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
      status: { $in: ['live', 'upcoming','ongoing'] },
      date: { $gte: new Date() }
    })
      .populate('hosterId', 'companyName')
      .sort({ date: 1, featured: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments({ 
      category, 
      status: { $in: ['live', 'upcoming','ongoing'] },
    });
    
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
      status: { $in: ['live', 'upcoming','ongoing'] },
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

export const addToGuestList = async (req, res) => {
  try {
    const { 
      eventId, 
      guestName, 
      email, 
      phone, 
      numberOfGuests, 
      additionalGuests, 
      specialRequests,
      address,
      city,
      country,
      hearAboutEvent
    } = req.body;
    
    const event = await Event.findById(eventId).populate('hosterId');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    if (numberOfGuests > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 guests allowed per registration'
      });
    }
    
    const existingGuest = await GuestList.findOne({
      eventId: eventId,
      phone: phone
    });
    
    if (existingGuest) {
      return res.status(400).json({
        success: false,
        error: 'This phone number is already registered for this event'
      });
    }
    
    let guestList = [];
    let totalGuests = 1;
    
    if (additionalGuests && Array.isArray(additionalGuests)) {
      guestList = additionalGuests
        .filter(g => g && g.name && g.name.trim() !== '')
        .map(g => ({
          name: g.name,
          email: g.email || '',
          phone: g.phone || ''
        }));
      totalGuests = 1 + guestList.length;
    }
    
    const guestEntry = new GuestList({
      eventId: event._id,
      hosterId: event.hosterId._id,
      guestName,
      email: email || '',
      phone,
      whatsapp: phone,
      additionalGuests: guestList,
      numberOfGuests: totalGuests,
      address: address || '',
      city: city || '',
      country: country || '',
      specialRequests: specialRequests || '',
      hearAboutEvent: hearAboutEvent || '',
      rsvpStatus: 'confirmed',
      addedBy: 'customer'
    });
    
    await guestEntry.save();
    
    const hosterWhatsapp = event.hosterId?.whatsappNumber || event.contactWhatsapp || '';
    let whatsappUrl = null;
    
    if (hosterWhatsapp) {
      let cleanWhatsapp = hosterWhatsapp.replace(/[\s+]/g, '');
      if (!cleanWhatsapp.startsWith('+')) {
        cleanWhatsapp = '+' + cleanWhatsapp;
      }
      
      let additionalGuestsText = '';
      if (guestList.length > 0) {
        additionalGuestsText = '%0A👥 *Additional Guests:*%0A';
        guestList.forEach((guest, index) => {
          additionalGuestsText += `   ${index + 1}. ${guest.name}`;
          if (guest.phone) additionalGuestsText += ` (${guest.phone})`;
          additionalGuestsText += '%0A';
        });
      }
      
      const whatsappMessage = `📋 *NEW GUEST LIST REGISTRATION* 📋%0A%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `📋 *EVENT DETAILS*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🏷️ Title: ${event.title}%0A` +
        `📅 Date: ${new Date(event.date).toLocaleDateString()}%0A` +
        `⏰ Time: ${event.time || 'N/A'}%0A` +
        `📍 Venue: ${event.venue || 'N/A'}%0A` +
        `📍 Location: ${event.location || 'N/A'}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `👤 *GUEST INFORMATION*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `👤 Name: ${guestName}%0A` +
        `📞 Phone: ${phone}%0A` +
        `📧 Email: ${email || 'Not provided'}%0A` +
        `🏠 Address: ${address || 'Not provided'}%0A` +
        `🏙️ City: ${city || 'Not provided'}%0A` +
        `🌍 Country: ${country || 'Not provided'}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `👥 *GROUP DETAILS*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🔢 Total Guests: ${totalGuests}%0A` +
        `${additionalGuestsText}%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `📝 *ADDITIONAL INFORMATION*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `📌 Special Requests: ${specialRequests || 'None'}%0A` +
        `📢 Heard About Event: ${hearAboutEvent || 'Not specified'}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🆔 *GUEST LIST ID*%0A` +
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `🔑 ID: ${guestEntry._id}%0A` +
        `📊 Status: Confirmed%0A` +
        `📅 Registered On: ${new Date().toLocaleString()}%0A%0A` +
        
        `━━━━━━━━━━━━━━━━━━━━━%0A` +
        `✅ Guest has been added to your event guest list.%0A` +
        `━━━━━━━━━━━━━━━━━━━━━`;
      
      whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${whatsappMessage}`;
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Added to guest list successfully',
      guest: {
        id: guestEntry._id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        venue: event.venue,
        guestName: guestEntry.guestName,
        phone: guestEntry.phone,
        email: guestEntry.email,
        numberOfGuests: guestEntry.numberOfGuests,
        additionalGuests: guestList,
        rsvpStatus: guestEntry.rsvpStatus
      },
      hosterWhatsapp: hosterWhatsapp || null,
      whatsappUrl: whatsappUrl
    });
    
  } catch (error) {
    console.error('Guest list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const checkReservationStatus = async (req, res) => {
  try {
    const { phone, eventId } = req.query;
    
    const query = { phone };
    if (eventId) query.eventId = eventId;
    
    const reservations = await Reservation.find(query)
      .populate('eventId', 'title date time venue location')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      reservations
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getUpcomingEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: { $in: ['live', 'upcoming','ongoing'] },
      date: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    })
      .populate('hosterId', 'companyName')
      .sort({ date: 1 })
      .limit(10);
    
    res.json({
      success: true,
      events
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Event.distinct('category', {
      status: { $in: ['live', 'upcoming','ongoing'] },
      date: { $gte: new Date() }
    });
    
    res.json({
      success: true,
      categories: categories.sort()
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};