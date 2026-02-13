import { Group, Title, Container, Button, Loader, Center } from "@mantine/core";
import { RoomsList } from "../../components/rooms/rooms-list";
import { useEffect, useState } from "react";
import api from "../../config/axios";
import type { RoomGetDto } from "../../constants/types";
import { modals } from "@mantine/modals";
import { useUser } from "../../authentication/use-auth";

export const HomePage = () => {
  const [rooms, setRooms] = useState<RoomGetDto[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useUser();
  const currentUserId = user.id;

  // Fetch rooms from backend
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await api.get<RoomGetDto[]>("/rooms");
      if (!response.data.has_errors) {
        const allRooms = response.data.data;
        const userRoom = allRooms.find(
          (room) => room.owner.id === currentUserId,
        );
        const otherRooms = allRooms.filter(
          (room) => room.owner.id !== currentUserId,
        );
        setRooms(userRoom ? [userRoom, ...otherRooms] : otherRooms);
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

        {/* Create room button */}
        <Button
          onClick={() =>
            modals.openContextModal({
              modal: "roomcreatemodal",
              title: "Create Room",
              innerProps: {
                onSuccess: fetchRooms,
              },
            })
          }
        >
          Create Room
        </Button>
      </Group>

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <Center>
          <p>No rooms available. Create one!</p>
        </Center>
      ) : (
        <RoomsList
          rooms={rooms}
          currentUserId={currentUserId}
          onRoomAction={fetchRooms}
        />
      )}
    </Container>
  );
};
