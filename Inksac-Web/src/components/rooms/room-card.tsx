import { Card, Group, Text, Badge, Button, Stack } from "@mantine/core";
import type { RoomGetDto } from "../../constants/types";
import { modals } from "@mantine/modals";

interface RoomCardProps {
  room: RoomGetDto;
  currentUserId: number;
  onRoomAction?: () => void;
  onJoinRoom?: (roomId: number) => void; // ready to implement joining a room
}

export function RoomCard({
  room,
  currentUserId,
  onRoomAction,
  onJoinRoom, // ready to implement joining a room
}: RoomCardProps) {
  const isUserRoom = room.owner.id === currentUserId;

  const openDeleteModal = () => {
    modals.openContextModal({
      modal: "roomdeletemodal",
      title: "Delete Room",
      innerProps: {
        onSuccess: onRoomAction,
      },
    });
  };

  const openUpdateModal = () => {
    modals.openContextModal({
      modal: "roomupdatemodal",
      title: "Edit Room",
      innerProps: {
        room,
        onSuccess: onRoomAction,
      },
    });
  };

  return (
    <Card shadow="sm" p="sm" mb="sm" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text style={{ fontWeight: 500 }}>{room.name}</Text>

          {isUserRoom ? (
            <Badge color="blue">Your Room</Badge>
          ) : (
            <Group gap="xs" align="center">
              <Text size="sm" c="dimmed">
                Owner:
              </Text>
              <Badge color="gray">{room.owner.username}</Badge>
            </Group>
          )}
        </Group>

        <Text size="sm" c="dimmed">
          Expires: {new Date(room.expiration).toLocaleString()}
        </Text>

        {/* Action buttons */}
        <Group gap="xs">
          {/* Join button for all rooms */}
          <Button size="xs" color="green">
            Join
          </Button>

          {/* Update button only for your room */}
          {isUserRoom && (
            <Button size="xs" color="violet" onClick={openUpdateModal}>
              Edit
            </Button>
          )}

          {/* Delete button only for your room */}
          {isUserRoom && (
            <Button size="xs" color="red" onClick={openDeleteModal}>
              Delete
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
