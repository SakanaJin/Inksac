import type { RoomGetDto } from "../constants/types";

/*
  Stable room sorting.

  Rules:
  1. Owner's room always first (if exists)
  2. Remaining rooms sorted by id ascending (stable, deterministic)
*/
export const sortRooms = (
  rooms: RoomGetDto[],
  currentUserId: number,
): RoomGetDto[] => {
  const ownerRoom = rooms.find((room) => room.owner.id === currentUserId);

  const otherRooms = rooms
    .filter((room) => room.owner.id !== currentUserId)
    .sort((a, b) => a.id - b.id);

  return ownerRoom ? [ownerRoom, ...otherRooms] : otherRooms;
};
