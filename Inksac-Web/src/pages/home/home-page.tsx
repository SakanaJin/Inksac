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
    roomList = (
      <RoomsList
        rooms={rooms}
        currentUserId={currentUserId}
        onRoomAction={invalidateAndRefresh}
      />
    );
  }

  useEffect(() => {
    invalidateAndRefresh();
  }, []);

  return (
    <Container size="lg">
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Title order={2}>Available Rooms</Title>
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
                  animation: isFetching ? "spin 1s linear infinite" : undefined,
                }}
              />
            }
          >
            Refresh
          </Button>
        </Group>

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
      </Group>

      <Box mih={200}>{roomList}</Box>
    </Container>
  );
};
