import {
  Card,
  Group,
  Text,
  Badge,
  Button,
  Stack,
  Tooltip,
} from "@mantine/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightToBracket,
  faPen,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import type { RoomGetDto, RoomOccupancy } from "../../constants/types";
import { modals } from "@mantine/modals";
import { useNavigate } from "react-router-dom";
import { IconUsers } from "@tabler/icons-react";

interface RoomCardProps {
  room: RoomGetDto;
  occupancy: RoomOccupancy;
  currentUserId: number;
  onRoomAction?: () => void;
  onJoinRoom?: (roomId: number) => void;
}

export const RoomCard = ({
  room,
  occupancy,
  currentUserId,
  onRoomAction,
  onJoinRoom,
}: RoomCardProps) => {
  const navigate = useNavigate();
  const isUserRoom = room.owner.id === currentUserId;
  const userCount = occupancy.users.length;
  const tooltipLabel =
    userCount > 0 ? (
      <Stack gap={2}>
        {occupancy.users.map((u) => (
          <Text key={u.id} size="xs">
            {u.username}
          </Text>
        ))}
      </Stack>
    ) : (
      "No users online"
    );

  const handleJoinRoom = () => {
    if (onJoinRoom) {
      onJoinRoom(room.id);
    }

    navigate(`/room/${room.id}`);
  };

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
          <Text fw={600} size="lg">
            {room.name}
          </Text>
          {isUserRoom ? (
            <Badge color="blue" variant="outline">
              Your Room
            </Badge>
          ) : (
            <Group gap={6} align="center">
              <Text size="sm" c="dimmed">
                Owner:
              </Text>
              <Text size="sm" fw={500}>
                {room.owner.username}
              </Text>
            </Group>
          )}
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Expires: {new Date(room.expiration).toLocaleString()}
          </Text>
          <Tooltip label={tooltipLabel} withArrow position="bottom">
            <Badge
              color={userCount > 0 ? "green" : "gray"}
              variant="light"
              leftSection={<IconUsers size={12} />}
              style={{ cursor: "default" }}
            >
              {userCount}
            </Badge>
          </Tooltip>
        </Group>

        {/* Action buttons */}
        <Group gap="xs">
          {/* Join button for all rooms */}
          <Button
            size="xs"
            radius="md"
            variant="light"
            color="green"
            leftSection={<FontAwesomeIcon icon={faRightToBracket} />}
            onClick={handleJoinRoom}
          >
            Join
          </Button>

          {/* Update button only for your room */}
          {isUserRoom && (
            <Button
              size="xs"
              radius="md"
              variant="light"
              color="blue"
              leftSection={<FontAwesomeIcon icon={faPen} />}
              onClick={openUpdateModal}
            >
              Edit
            </Button>
          )}

          {/* Delete button only for your room */}
          {isUserRoom && (
            <Button
              size="xs"
              radius="md"
              variant="light"
              color="red"
              leftSection={<FontAwesomeIcon icon={faTrash} />}
              onClick={openDeleteModal}
            >
              Delete
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
};
