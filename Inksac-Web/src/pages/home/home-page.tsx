import {
  Group,
  Title,
  Container,
  Button,
  Center,
  Tooltip,
  Box,
} from "@mantine/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateRight, faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import { RoomsList } from "../../components/rooms/rooms-list";
import { sortRooms } from "../../utils/room-utils";
import { useEffect, useState } from "react";
import api from "../../config/axios";
import { UserRole, type RoomGetDto } from "../../constants/types";
import { modals } from "@mantine/modals";
import { useUser } from "../../authentication/use-auth";
import { useNavigate } from "react-router-dom";

export const HomePage = () => {
  const user = useUser();
  const navigate = useNavigate();
  const currentUserId = user.id;

  // Initialize from sessionStorage cache to prevent UI flicker on reload
  const cachedRooms = sessionStorage.getItem("roomsCache");

  const [rooms, setRooms] = useState<RoomGetDto[]>(() =>
    cachedRooms ? sortRooms(JSON.parse(cachedRooms), currentUserId) : [],
  );

  const [loading, setLoading] = useState(() => !cachedRooms);

  const [refreshing, setRefreshing] = useState(false);

  /*
  Derived state based on current rooms list
*/
  const ownsRoom = rooms.some((room) => room.owner.id === currentUserId);

  const canCreateRoom = user.role !== UserRole.GUEST && !ownsRoom;

  let createRoomTooltip: string | undefined;

  if (user.role === UserRole.GUEST)
    createRoomTooltip = "Guests cannot create rooms";
  else if (ownsRoom) createRoomTooltip = "You already own a room";

  const emptyMessage =
    user.role === UserRole.GUEST
      ? "No rooms available and you can't create a room as a guest. Sucks to suck!"
      : "No rooms available. Create a room and start doodling!";

  /*
    Fetch rooms
  */
  const fetchRooms = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = sessionStorage.getItem("roomsCache");

      if (cached) {
        const parsed = JSON.parse(cached);
        setRooms(sortRooms(parsed, currentUserId));
        setLoading(false);
        return;
      }
    }

    if (!sessionStorage.getItem("roomsCache")) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await api.get<RoomGetDto[]>("/rooms");

      if (!response.data.has_errors) {
        const allRooms = response.data.data;

        const sortedRooms = sortRooms(allRooms, currentUserId);

        // Persist cache in sessionStorage to survive page reloads
        sessionStorage.setItem("roomsCache", JSON.stringify(sortedRooms));

        setRooms(sortedRooms);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
    Initial fetch
  */
  useEffect(() => {
    fetchRooms();
  }, []);

  /*
    Called when room created / deleted / joined / left
  */
  const invalidateAndRefresh = () => {
    sessionStorage.removeItem("roomsCache");
    fetchRooms(true);
  };

  /*
    Room list render
  */
  let roomList = null;

  if (!loading) {
    if (rooms.length === 0) {
      roomList = (
        <Center>
          <p>{emptyMessage}</p>
        </Center>
      );
    } else {
      roomList = (
        <RoomsList
          rooms={rooms}
          currentUserId={currentUserId}
          onRoomAction={invalidateAndRefresh}
        />
      );
    }
  }

  return (
    <Container size="lg">
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Title order={2}>Available Rooms</Title>

          <Button
            size="xs"
            radius="md"
            variant="outline"
            onClick={() => fetchRooms(true)}
            loading={refreshing}
            leftSection={
              <FontAwesomeIcon icon={faRotateRight} spin={refreshing} />
            }
          >
            Refresh
          </Button>
        </Group>

        {/* Create Room */}
        <Tooltip label={createRoomTooltip} disabled={canCreateRoom}>
          <Button
            onClick={() =>
              modals.openContextModal({
                modal: "roomcreatemodal",
                title: "Create Room",
                innerProps: {
                  onSuccess: (createdRoom: RoomGetDto) => {
                    invalidateAndRefresh();
                    navigate(`/room/${createdRoom.id}`);
                  },
                },
              })
            }
            disabled={!canCreateRoom}
            variant="gradient"
            gradient={{ from: "indigo", to: "cyan", deg: 90 }}
            radius="md"
            size="sm"
            leftSection={<FontAwesomeIcon icon={faDoorOpen} />}
            styles={{
              root: {
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                transition: "all 150ms ease",
              },
            }}
          >
            Create Room
          </Button>
        </Tooltip>
      </Group>

      {/* Room list */}
      <Box mih={200}>{roomList}</Box>
    </Container>
  );
};
