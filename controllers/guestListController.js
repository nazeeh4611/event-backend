import GuestList from '../models/GuestList.js';
import Event from '../models/Event.js';

const addToGuestList = async (req, res) => {
  try {
    const guestData = req.body;

    const event = await Event.findById(guestData.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const existingGuest = await GuestList.findOne({
      eventId: guestData.eventId,
      email: guestData.email
    });

    if (existingGuest) {
      return res.status(400).json({
        success: false,
        error: 'Guest already exists for this event'
      });
    }

    const guest = new GuestList(guestData);
    await guest.save();

    res.status(201).json({ success: true, guest });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getGuestList = async (req, res) => {
  try {
    const { eventId, rsvpStatus, checkedIn, page = 1, limit = 50 } = req.query;
    const query = {};

    if (eventId) query.eventId = eventId;
    if (rsvpStatus) query.rsvpStatus = rsvpStatus;
    if (checkedIn !== undefined) query.checkedIn = checkedIn === 'true';

    const guests = await GuestList.find(query)
      .populate('eventId', 'title date venue')
      .sort({ addedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await GuestList.countDocuments(query);

    const stats = {
      total: await GuestList.countDocuments({ eventId }),
      confirmed: await GuestList.countDocuments({
        eventId,
        rsvpStatus: 'confirmed'
      }),
      checkedIn: await GuestList.countDocuments({
        eventId,
        checkedIn: true
      })
    };

    res.json({
      success: true,
      guests,
      stats,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalGuests: total
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateGuest = async (req, res) => {
  try {
    const updates = req.body;

    const guest = await GuestList.findByIdAndUpdate(
      req.params.id,
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

const checkInGuest = async (req, res) => {
  try {
    const guest = await GuestList.findByIdAndUpdate(
      req.params.id,
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

const deleteGuest = async (req, res) => {
  try {
    const guest = await GuestList.findByIdAndDelete(req.params.id);

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

export default {
  addToGuestList,
  getGuestList,
  updateGuest,
  checkInGuest,
  deleteGuest
};
