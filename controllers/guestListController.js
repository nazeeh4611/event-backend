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

    if (req.admin.role === 'hoster' && event.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to add guests to this event'
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

    guestData.addedBy = req.admin._id;
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
    let query = {};

    if (eventId) query.eventId = eventId;
    if (rsvpStatus) query.rsvpStatus = rsvpStatus;
    if (checkedIn !== undefined) query.checkedIn = checkedIn === 'true';

    if (req.admin.role === 'hoster') {
      const events = await Event.find({ createdBy: req.admin._id }).select('_id');
      const eventIds = events.map(e => e._id);
      query.eventId = { $in: eventIds };
    }

    const guests = await GuestList.find(query)
      .populate('eventId', 'title date venue createdBy')
      .populate('addedBy', 'username company')
      .sort({ addedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await GuestList.countDocuments(query);

    let stats = {};
    if (eventId) {
      stats = {
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
    }

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

    const guest = await GuestList.findById(req.params.id).populate('eventId');
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    if (req.admin.role === 'hoster' && guest.eventId.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this guest'
      });
    }

    const updatedGuest = await GuestList.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate('eventId').populate('addedBy');

    res.json({ success: true, guest: updatedGuest });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const checkInGuest = async (req, res) => {
  try {
    const guest = await GuestList.findById(req.params.id).populate('eventId');
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    if (req.admin.role === 'hoster' && guest.eventId.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to check in this guest'
      });
    }

    const updatedGuest = await GuestList.findByIdAndUpdate(
      req.params.id,
      {
        checkedIn: true,
        checkInTime: new Date()
      },
      { new: true }
    );

    res.json({ success: true, guest: updatedGuest });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteGuest = async (req, res) => {
  try {
    const guest = await GuestList.findById(req.params.id).populate('eventId');
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        error: 'Guest not found'
      });
    }

    if (req.admin.role === 'hoster' && guest.eventId.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this guest'
      });
    }

    await GuestList.findByIdAndDelete(req.params.id);

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