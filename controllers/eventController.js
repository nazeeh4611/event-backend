import Event from '../models/Event.js';
import { v2 as cloudinary } from 'cloudinary';

const createEvent = async (req, res) => {
  try {
    const eventData = req.body;

    if (req.body.images && req.body.images.length > 0) {
      const imageUploads = req.body.images.map(async (image) => {
        const result = await cloudinary.uploader.upload(image, {
          folder: 'eventra/events'
        });
        return result.secure_url;
      });

      eventData.images = await Promise.all(imageUploads);
      eventData.featuredImage = eventData.images[0];
    }

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
    const updates = req.body;

    if (updates.images && updates.images.length > 0) {
      const imageUploads = updates.images.map(async (image) => {
        if (image.startsWith('http')) return image;

        const result = await cloudinary.uploader.upload(image, {
          folder: 'eventra/events'
        });

        return result.secure_url;
      });

      updates.images = await Promise.all(imageUploads);
      updates.featuredImage = updates.images[0];
    }

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

export default {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getCarouselEvents,
  updateCarouselOrder
};
