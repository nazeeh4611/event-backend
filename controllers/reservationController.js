import Reservation from '../models/Reservation.js';
import Event from '../models/Event.js';

const createReservation = async (req, res) => {
  try {
    const reservationData = req.body;

    const event = await Event.findById(reservationData.eventId);
    if (!event) {
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

    const reservation = new Reservation(reservationData);
    await reservation.save();

    event.bookedSeats += reservationData.numberOfTickets;
    await event.save();

    res.status(201).json({ success: true, reservation });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReservations = async (req, res) => {
  try {
    const { eventId, status, page = 1, limit = 20 } = req.query;
    let query = {};

    if (eventId) query.eventId = eventId;
    if (status) query.status = status;

    if (req.admin.role === 'hoster') {
      const events = await Event.find({ createdBy: req.admin._id }).select('_id');
      const eventIds = events.map(e => e._id);
      query.eventId = { $in: eventIds };
    }

    const reservations = await Reservation.find(query)
      .populate('eventId', 'title date venue createdBy')
      .sort({ reservationDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Reservation.countDocuments(query);

    res.json({
      success: true,
      reservations,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalReservations: total
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const reservation = await Reservation.findById(req.params.id).populate('eventId');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }

    if (req.admin.role === 'hoster' && reservation.eventId.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this reservation'
      });
    }

    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('eventId');

    res.json({ success: true, reservation: updatedReservation });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  createReservation,
  getReservations,
  updateReservationStatus
};