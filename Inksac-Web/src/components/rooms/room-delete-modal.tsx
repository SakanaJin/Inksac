import { Stack, Text, Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import { useState } from "react";

export interface RoomDeleteModalProps {
  onSuccess?: () => void;
}

export function RoomDeleteModal({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomDeleteModalProps>) {
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
    <Stack>
      <Text>
        Are you sure you want to delete your room? This action cannot be undone.
      </Text>

      <Button color="red" onClick={handleDelete} loading={loading}>
        Delete Room
      </Button>

      <Button variant="outline" onClick={() => context.closeModal(id)}>
        Cancel
      </Button>
    </Stack>
  );
}
