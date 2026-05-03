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
import { IconRefresh } from "@tabler/icons-react";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons";
import { RoomsList } from "../../components/rooms/rooms-list";
import { useEffect, type ReactNode } from "react";
import { UserRole, type RoomGetDto } from "../../constants/types";
import { modals } from "@mantine/modals";
import { useUser } from "../../authentication/use-auth";
import { useNavigate } from "react-router-dom";
import { useRooms } from "../../context/rooms-context";

export const HomePage = () => {
  const user = useUser();
  const navigate = useNavigate();
  const currentUserId = user.id;
  const { rooms, isFetching, hasFetched, refresh, invalidateAndRefresh } =
    useRooms();

  const ownsRoom = rooms.some((room) => room.owner.id === currentUserId);
  const canCreateRoom = user.role !== UserRole.GUEST && !ownsRoom && hasFetched;

  let createRoomTooltip: string | undefined;
  if (user.role === UserRole.GUEST)
    createRoomTooltip = "Guests cannot create rooms";
  else if (ownsRoom) createRoomTooltip = "You already own a room";

  const emptyMessage =
    user.role === UserRole.GUEST
      ? "No rooms available and you can't create a room as a guest. Sucks to suck!"
      : "No rooms available. Create a room and start doodling!";

  let roomList: ReactNode;
  if (!hasFetched) {
    roomList = null;
  } else if (rooms.length === 0) {
    roomList = (
      <Center>
        <p>{emptyMessage}</p>
      </Center>
    );
  } else {
    roomList = <RoomsList rooms={rooms} onRoomAction={invalidateAndRefresh} />;
  }

  useEffect(() => {
    invalidateAndRefresh();
  }, []);

  return (
    <Container size="lg" style={{ height: "100%", paddingBottom: 40 }}>
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 200 }}>
          <Title order={2}>Available Rooms</Title>
          <Box>
            <Button
              size="xs"
              radius="md"
              variant="outline"
              onClick={() => refresh()}
              leftSection={
                <IconRefresh
                  size={16}
                  style={{
                    transform: "scaleX(-1)",
                    animation: isFetching
                      ? "spin 1s linear infinite"
                      : undefined,
                  }}
                />
              }
            >
              Refresh
            </Button>
          </Box>
        </Group>
        <Box>
          <Tooltip label={createRoomTooltip} disabled={canCreateRoom}>
            <Button
              onClick={() =>
                modals.openContextModal({
                  modal: "roomcreatemodal",
                  title: "Create Room",
                  innerProps: {
                    defaultRoomName: `${user.username}'s Room`,
                    onSuccess: (createdRoom: RoomGetDto) => {
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
        </Box>
      </Group>

      <Box
        style={{
          height: "calc(100% - 52px)",
          overflowY: "auto",
          paddingRight: 8,
        }}
      >
        {roomList}
      </Box>
    </Container>
  );
};
