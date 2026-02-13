import { useState } from "react";
import { TextInput, Button, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import { type RoomGetDto, type RoomCreateDto } from "../../constants/types";

export interface RoomCreateModalProps {
  onSuccess?: (room: RoomGetDto) => void;
}

export function RoomCreateModal({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomCreateModalProps>) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);

    try {
      const payload: RoomCreateDto = { name };

      const response = await api.post<RoomGetDto>("/rooms", payload);

      if (response.data.has_errors) {
        response.data.errors.forEach((err) => {
          notifications.show({
            color: "red",
            title: "Error",
            message: `${err.property}: ${err.message}`,
          });
        });
        return;
      }

      notifications.show({
        color: "green",
        title: "Success",
        message: "Room created successfully",
      });

      innerProps.onSuccess?.(response.data.data);

      context.closeModal(id);
    } catch (err: any) {
      notifications.show({
        color: "red",
        title: "Server Error",
        message: err?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <TextInput
        label="Room Name"
        placeholder="Enter room name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
      />

      <Button onClick={handleCreate} loading={loading}>
        Create Room
      </Button>
    </Stack>
  );
}
