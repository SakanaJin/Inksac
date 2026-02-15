import { SimpleGrid } from "@mantine/core";
import { RoomCard } from "./room-card";
import type { RoomGetDto } from "../../constants/types";

interface RoomsListProps {
  rooms: RoomGetDto[];
  currentUserId: number;
  onRoomAction?: () => void;
  onJoinRoom?: (roomId: number) => void; // ready to implement joining room logic
}

export const RoomsList = ({
  rooms,
  currentUserId,
  onRoomAction,
  onJoinRoom,
}: RoomsListProps) => {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          currentUserId={currentUserId}
          onRoomAction={onRoomAction}
          onJoinRoom={onJoinRoom}
        />
      ))}
    </SimpleGrid>
  );
};
