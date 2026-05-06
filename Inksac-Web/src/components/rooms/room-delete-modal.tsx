import { Stack, Text, Button, Group, ThemeIcon, Paper } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import { useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface RoomDeleteModalProps {
  onSuccess?: () => void;
}

export const RoomDeleteModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomDeleteModalProps>) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    const response = await api.delete<boolean>("/rooms");

    if (response.data.has_errors) {
      response.data.errors.forEach((err) => {
        notifications.show({
          color: "red",
          title: "Error",
          message: err.message,
        });
      });

      setLoading(false);
      return;
    }

    notifications.show({
      color: "green",
      title: "Deleted",
      message: "Room deleted successfully",
    });

    innerProps.onSuccess?.();
    context.closeModal(id);
    setLoading(false);
  };

  return (
    <Stack gap="md">
      <Paper
        radius="md"
        p="md"
        style={{
          background: "rgba(28, 33, 43, 0.96)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Group align="flex-start" wrap="nowrap">
          <ThemeIcon color="red" variant="light" size="lg" radius="md">
            <IconAlertTriangle size={20} />
          </ThemeIcon>
          <Text size="sm" c="dimmed">
            This will permanently delete the room and its canvas data. This
            action cannot be undone.
          </Text>
        </Group>
      </Paper>

      <Group justify="flex-end" gap="sm">
        <Button
          variant="subtle"
          color="gray"
          radius="md"
          onClick={() => context.closeModal(id)}
        >
          Cancel
        </Button>

        <Button
          color="red"
          radius="md"
          onClick={handleDelete}
          loading={loading}
        >
          Delete Room
        </Button>
      </Group>
    </Stack>
  );
};
