import { SimpleGrid, Text } from "@mantine/core";
import { RoomCard } from "./room-card";

// fake room data for now
const mockRooms = [
  { id: "1", name: "testroom", owner: "Devin" },
  { id: "2", name: "NSFW", owner: "Derrick" },
  { id: "3", name: "Brainstorm", owner: "Caleb" },
];

export function RoomsList() {
  if (mockRooms.length === 0) {
    return <Text c="dimmed">No rooms available. Create one!</Text>;
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
      {mockRooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </SimpleGrid>
  );
}
