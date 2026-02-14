import {
  Group,
  Title,
  Container,
  Button,
  Loader,
  Center,
  Tooltip,
} from "@mantine/core";
import { RoomsList } from "../../components/rooms/rooms-list";
import { useEffect, useState } from "react";
import api from "../../config/axios";
import { UserRole, type RoomGetDto } from "../../constants/types";
import { modals } from "@mantine/modals";
import { useUser } from "../../authentication/use-auth";
import { useNavigate } from "react-router-dom";

export const HomePage = () => {
  const [rooms, setRooms] = useState<RoomGetDto[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useUser();
  const navigate = useNavigate();
  const currentUserId = user.id;

  /* Determine whether the current user already owns a room.
     We derive this from the rooms list instead of relying on user.has_room
     to avoid stale auth state after room mutations. */
  const ownsRoom = rooms.some((room) => room.owner.id === currentUserId);

  /* A user can create a room if they are not a guest and
     they do not already own one. */
  const canCreateRoom = user.role !== UserRole.GUEST && !ownsRoom;

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
        <Tooltip
          label={
            user.role === UserRole.GUEST
              ? "Guests cannot create rooms"
              : ownsRoom
                ? "You already own a room" // enable once UserGetDto has has_room property
                : ""
          }
          disabled={canCreateRoom}
        >
          <Button
            onClick={() =>
              modals.openContextModal({
                modal: "roomcreatemodal",
                title: "Create Room",
                innerProps: {
                  onSuccess: (createdRoom: RoomGetDto) => {
                    navigate(`/room/${createdRoom.id}`);
                  },
                },
              })
            }
            disabled={!canCreateRoom}
          >
            Create Room
          </Button>
        </Tooltip>
      </Group>

      {/* Rooms List */}
      {rooms.length === 0 &&
      (user.role === UserRole.ADMIN || user.role === UserRole.USER) ? (
        <Center>
          <p>No rooms available. You should create one!</p>
        </Center>
      ) : rooms.length === 0 && user.role === UserRole.GUEST ? (
        <Center>
          <p>
            No rooms available. You can't create a room as a guest. Sucks to
            suck!
          </p>
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
