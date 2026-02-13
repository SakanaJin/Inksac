import { useState } from "react";
import { TextInput, Button, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import { type RoomUpdateDto, type RoomGetDto } from "../../constants/types";

export interface RoomUpdateModalProps {
  room: RoomGetDto;
  onSuccess?: (room: RoomGetDto) => void;
}

export function RoomUpdateModal({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomUpdateModalProps>) {
  const [name, setName] = useState(innerProps.room.name);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload: RoomUpdateDto = { name };
      const response = await api.patch<RoomGetDto>("/rooms", payload);

      if (response.data.has_errors) {
        response.data.errors.forEach((err) =>
          notifications.show({
            color: "red",
            title: "Error",
            message: `${err.property}: ${err.message}`,
          }),
        );
        return;
      }

      notifications.show({
        color: "green",
        title: "Success",
        message: "Room updated successfully",
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

      <Button onClick={handleUpdate} loading={loading}>
        Update Room
      </Button>
    </Stack>
  );
}
