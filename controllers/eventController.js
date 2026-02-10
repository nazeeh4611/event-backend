import Event from '../models/Event.js';
import cloudinary from '../Config/cloudinary.js';
import Admin from '../models/Admin.js';

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

const createEvent = async (req, res) => {
  try {
    if (req.admin.role !== 'hoster') {
      return res.status(403).json({
        success: false,
        error: 'Only hosters can create events'
      });
    }

    const eventData = JSON.parse(JSON.stringify(req.body));
    const imageUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }
    }

    const featuredImageIndex = parseInt(eventData.featuredImageIndex) || 0;
    
    eventData.images = imageUrls;
    eventData.featuredImage = imageUrls[featuredImageIndex] || imageUrls[0] || '';
    eventData.tags = eventData.tags ? eventData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    eventData.price = parseFloat(eventData.price);
    eventData.capacity = parseInt(eventData.capacity);
    eventData.createdBy = req.admin._id;
    eventData.hosterName = req.admin.company || req.admin.username;

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const { category, status, featured, page = 1, limit = 10 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (featured) query.isFeatured = featured === 'true';

    if (req.admin.role === 'hoster') {
      query.createdBy = req.admin._id;
    }

    const events = await Event.find(query)
      .sort({ date: 1, carouselPosition: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalEvents: total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

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

const updateEvent = async (req, res) => {
  try {
    const updates = JSON.parse(JSON.stringify(req.body));
    const imageUrls = [];

    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (req.admin.role === 'hoster' && event.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this event'
      });
    }

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
    
    if (req.admin.role === 'superadmin') {
      updates.isFeatured = updates.isFeatured === 'true';
    }

    delete updates.existingImages;
    delete updates.featuredImageIndex;

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    if (req.admin.role === 'hoster' && event.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this event'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCarouselEvents = async (req, res) => {
  try {
    const events = await Event.find({ isFeatured: true })
      .sort({ carouselPosition: 1, date: 1 })
      .limit(10);

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateCarouselOrder = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can update carousel order'
      });
    }

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

const updateCarouselStatus = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can update carousel status'
      });
    }

    const { isFeatured, carouselPosition } = req.body;
    
    const updateData = {};
    
    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured;
    }
    
    if (carouselPosition !== undefined) {
      updateData.carouselPosition = carouselPosition;
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({ 
      success: true, 
      message: 'Carousel status updated',
      event 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllEventsForSuperadmin = async (req, res) => {
  try {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can view all events'
      });
    }

    const { page = 1, limit = 20, hosterId, status } = req.query;
    let query = {};

    if (hosterId) query.createdBy = hosterId;
    if (status) query.status = status;

    const events = await Event.find(query)
      .populate('createdBy', 'username company email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    res.json({
      success: true,
      events,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalEvents: total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getCarouselEvents,
  updateCarouselOrder,
  updateCarouselStatus,
  getAllEventsForSuperadmin
};