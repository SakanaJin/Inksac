import { Group, Title, Container, Button, Loader, Center } from "@mantine/core";
import { RoomsList } from "../../components/rooms/rooms-list";
import { useEffect, useState } from "react";
import api from "../../config/axios";
import type { RoomGetDto } from "../../constants/types";

export const HomePage = () => {
  const [rooms, setRooms] = useState<RoomGetDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch rooms from backend
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await api.get<RoomGetDto[]>("/rooms");
      if (!response.data.has_errors) {
        setRooms(response.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <Container size="lg">
      {/* Header: Title + Refresh + Create Room */}
      <Group justify="space-between" mb="md">
        <Group gap="sm" align="center">
          <Title order={2}>Available Rooms</Title>

          {/* Refresh button with emoji. change to something better later */}
          <Button
            size="xs"
            variant="outline"
            onClick={fetchRooms}
            disabled={loading}
          >
            🔄 Refresh
          </Button>
          {loading ? <Loader /> : <></>}
        </Group>

        {/* Create room button - modal integration later */}
        <Button>Create Room</Button>
      </Group>

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <Center>
          <p>No rooms available. Create one!</p>
        </Center>
      ) : (
        <RoomsList rooms={rooms} />
      )}
    </Container>
  );
};
