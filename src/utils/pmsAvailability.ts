import type { DatabaseState } from '../db';
import type { PMSReservation, PMSRoom } from '../types';

const blockedStatuses: PMSReservation['status'][] = ['cancelled', 'no_show', 'checked_out', 'waitlisted'];

export const isPMSRoomAvailable = (
  db: DatabaseState,
  room: PMSRoom,
  arrivalDate: string,
  departureDate: string,
  options: { reservationId?: string; guests?: number; roomType?: string } = {}
) => {
  if (room.status === 'maintenance') return false;
  if (options.guests && room.capacity < options.guests) return false;
  if (options.roomType && room.roomType !== options.roomType) return false;
  return !db.pmsReservations.some(reservation => (
    reservation.id !== options.reservationId
    && reservation.roomId === room.id
    && !blockedStatuses.includes(reservation.status)
    && arrivalDate < reservation.departureDate
    && departureDate > reservation.arrivalDate
  ));
};

export const getPMSAvailabilityByType = (db: DatabaseState, arrivalDate: string, departureDate: string) => (
  Array.from(new Set(db.pmsRooms.map(room => room.roomType))).map(roomType => {
    const rooms = db.pmsRooms.filter(room => room.roomType === roomType);
    const availableRooms = rooms.filter(room => isPMSRoomAvailable(db, room, arrivalDate, departureDate, { roomType }));
    const rateOverride = db.pmsRateOverrides.find(item => item.roomType === roomType && item.date === arrivalDate);
    const baseRate = db.pmsRatePlans.find(item => item.roomType === roomType && item.active)?.baseRate || rooms[0]?.nightlyRate || 0;
    return { roomType, total: rooms.length, available: availableRooms.length, price: rateOverride?.price || baseRate, closed: Boolean(rateOverride?.closed) };
  })
);
