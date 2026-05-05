import {
  Group,
  Title,
  Container,
  Button,
  Center,
  Tooltip,
  Box,
  Text,
  Stack,
  Paper,
} from "@mantine/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconRefresh, IconSparkles } from "@tabler/icons-react";
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
  if (user.role === UserRole.GUEST) {
    createRoomTooltip = "Guests cannot create rooms";
  } else if (ownsRoom) {
    createRoomTooltip = "You already own a room";
  }

  const emptyMessage =
    user.role === UserRole.GUEST
      ? "No rooms are available right now. Guests can join rooms, but cannot create them."
      : "No rooms are available yet. Create a room and start doodling!";

  const openCreateRoomModal = () => {
    modals.openContextModal({
      modal: "roomcreatemodal",
      title: "Create Room",
      centered: true,
      styles: {
        content: {
          background: "rgba(20, 24, 31, 0.98)",
        },
        header: {
          background: "rgba(20, 24, 31, 0.98)",
        },
        body: {
          background: "rgba(20, 24, 31, 0.98)",
        },
      },
      innerProps: {
        defaultRoomName: `${user.username}'s Room`,
        onSuccess: (createdRoom: RoomGetDto) => {
          navigate(`/room/${createdRoom.id}`);
        },
      },
    });
  };

  let roomList: ReactNode;
  if (!hasFetched) {
    roomList = null;
  } else if (rooms.length === 0) {
    roomList = (
      <Center h="100%">
        <Paper
          radius="md"
          p="xl"
          style={{
            width: "100%",
            maxWidth: 520,
            textAlign: "center",
            background: "rgba(20, 24, 31, 0.92)",
            boxShadow: "0 14px 45px rgba(0,0,0,0.22)",
          }}
        >
          <Stack align="center" gap="sm">
            <Center
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "rgba(34, 139, 230, 0.14)",
              }}
            >
              <IconSparkles size={28} color="#74c0fc" />
            </Center>

            <Title order={3}>No rooms yet</Title>

            <Text c="dimmed" size="sm" maw={390}>
              {emptyMessage}
            </Text>

            {user.role !== UserRole.GUEST && !ownsRoom ? (
              <Button
                mt="sm"
                radius="md"
                color="blue"
                leftSection={<FontAwesomeIcon icon={faDoorOpen} />}
                onClick={openCreateRoomModal}
              >
                Create your first room
              </Button>
            ) : null}
          </Stack>
        </Paper>
      </Center>
    );
  } else {
    roomList = <RoomsList rooms={rooms} onRoomAction={invalidateAndRefresh} />;
  }

  useEffect(() => {
    invalidateAndRefresh();
  }, []);

  return (
    <Box
      style={{
        minHeight: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#0b0f17",
      }}
    >
      <Container
        size="lg"
        style={{
          height: "100%",
          paddingTop: 28,
          paddingBottom: 40,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Paper
          radius="md"
          p="lg"
          mb="lg"
          style={{
            background: "rgba(20, 24, 31, 0.94)",
            boxShadow: "0 14px 45px rgba(0,0,0,0.20)",
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Text
                size="xs"
                fw={800}
                tt="uppercase"
                style={{
                  letterSpacing: 2,
                  color: "#74c0fc",
                }}
              >
                Inksac Rooms
              </Text>

              <Title
                order={2}
                style={{
                  letterSpacing: -0.5,
                }}
              >
                Available Rooms
              </Title>

              <Text size="sm" c="dimmed">
                Join an active canvas or create your own collaborative drawing
                room.
              </Text>
            </Stack>

            <Group gap="sm" wrap="nowrap">
              <Button
                size="sm"
                radius="md"
                variant="light"
                color="gray"
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

              <Tooltip label={createRoomTooltip} disabled={canCreateRoom}>
                <Button
                  onClick={openCreateRoomModal}
                  disabled={!canCreateRoom}
                  color="blue"
                  radius="md"
                  size="sm"
                  leftSection={<FontAwesomeIcon icon={faDoorOpen} />}
                  styles={{
                    root: {
                      fontWeight: 700,
                      boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                      transition: "all 150ms ease",
                    },
                  }}
                >
                  Create Room
                </Button>
              </Tooltip>
            </Group>
          </Group>
        </Paper>

        <Paper
          radius="md"
          p="md"
          style={{
            height: "calc(100% - 150px)",
            overflow: "hidden",
            background: "rgba(20, 24, 31, 0.78)",
          }}
        >
          <Box
            style={{
              height: "100%",
              overflowY: "auto",
              paddingRight: 8,
            }}
          >
            {roomList}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
