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
    const query = {};

    if (eventId) query.eventId = eventId;
    if (status) query.status = status;

    const reservations = await Reservation.find(query)
      .populate('eventId', 'title date venue')
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

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('eventId');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found'
      });
    }

    res.json({ success: true, reservation });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  createReservation,
  getReservations,
  updateReservationStatus
};
