import { SimpleGrid } from "@mantine/core";
import { RoomCard } from "./room-card";
import type { RoomGetDto } from "../../constants/types";

interface RoomsListProps {
  rooms: RoomGetDto[];
}

export function RoomsList({ rooms }: RoomsListProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </SimpleGrid>
  );
}
