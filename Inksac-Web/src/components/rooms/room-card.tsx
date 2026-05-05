import { Card, Group, Text, Badge, Button, Stack } from "@mantine/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightToBracket,
  faPen,
  faTrash,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import type { RoomGetDto } from "../../constants/types";
import { modals } from "@mantine/modals";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../authentication/use-auth";

interface RoomCardProps {
  room: RoomGetDto;
  onRoomAction?: () => void;
  onJoinRoom?: (roomId: number) => void;
}

export const RoomCard = ({ room, onRoomAction, onJoinRoom }: RoomCardProps) => {
  const user = useUser();
  const navigate = useNavigate();
  const isUserRoom = room.owner.id === user.id;
  const userCount = room.user_count;
  const canJoin = !room.private || room.allowed_user_ids.includes(user.id);

  const handleJoinRoom = () => {
    if (onJoinRoom) {
      onJoinRoom(room.id);
    }

    navigate(`/room/${room.id}`);
  };

  const openDeleteModal = () => {
    modals.openContextModal({
      modal: "roomdeletemodal",
      title: "Delete your room?",
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
        onSuccess: onRoomAction,
      },
    });
  };

  const openUpdateModal = () => {
    modals.openContextModal({
      modal: "roomupdatemodal",
      title: "Edit Room",
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
        room,
        onSuccess: onRoomAction,
      },
    });
  };

  return (
    <Card
      shadow="sm"
      p="md"
      mb="sm"
      radius="md"
      style={{
        background: "rgba(28, 33, 43, 0.96)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" style={{ minWidth: 0 }}>
          {/* Always strong */}
          <Text
            fw={700}
            truncate
            title={room.name}
            style={{
              minWidth: 0,
              flex: 1,
              letterSpacing: -0.2,
            }}
          >
            {room.name}
          </Text>

          {isUserRoom ? (
            <Badge color="blue" variant="light" style={{ flexShrink: 0 }}>
              Your Room
            </Badge>
          ) : (
            <Group
              gap={6}
              align="center"
              wrap="nowrap"
              style={{ flexShrink: 0 }}
            >
              <Badge variant="light" color={room.private ? "red" : "blue"}>
                {room.private ? "Private" : "Public"}
              </Badge>
              <Text size="sm" c="dimmed">
                Owner:
              </Text>
              <Text size="sm" fw={500} truncate maw={120}>
                {room.owner.username}
              </Text>
            </Group>
          )}
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Expires: {new Date(room.expiration).toLocaleString()}
          </Text>

          <Badge
            color={userCount > 0 ? "green" : "gray"}
            variant="light"
            leftSection={<FontAwesomeIcon icon={faUsers} size="xs" />}
          >
            {userCount}
          </Badge>
        </Group>

        {/* Action buttons */}
        <Group gap="xs">
          {/* Join button for all rooms */}
          <Button
            size="xs"
            radius="md"
            variant="light"
            color="blue"
            leftSection={<FontAwesomeIcon icon={faRightToBracket} />}
            onClick={handleJoinRoom}
            disabled={!canJoin}
          >
            Join
          </Button>

          {/* Update button only for your room */}
          {isUserRoom && (
            <Button
              size="xs"
              radius="md"
              variant="subtle"
              color="gray"
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
              variant="subtle"
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
