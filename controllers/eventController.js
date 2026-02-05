import Event from '../models/Event.js';
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

const createEvent = async (req, res) => {
  try {
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
    eventData.isFeatured = eventData.isFeatured === 'true';

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
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (featured) query.isFeatured = featured === 'true';

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
    updates.isFeatured = updates.isFeatured === 'true';

    delete updates.existingImages;
    delete updates.featuredImageIndex;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

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

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

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

export default {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getCarouselEvents,
  updateCarouselOrder,
  updateCarouselStatus
};