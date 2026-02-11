import { Group, Title, Container, Button } from "@mantine/core";
import { RoomsList } from "../../components/rooms/rooms-list";

export const HomePage = () => {
  return (
    <Container size="lg">
      <Group justify="space-between" mb="md">
        <Title order={2}>Available Rooms</Title>
        <Button>Create Room</Button>
      </Group>
      <RoomsList />
    </Container>
  );
};
