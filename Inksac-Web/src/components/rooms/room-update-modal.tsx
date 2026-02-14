import { useForm, type FormErrors } from "@mantine/form";
import type { ContextModalProps } from "@mantine/modals";
import { Button, Flex, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import api from "../../config/axios";
import { type RoomUpdateDto, type RoomGetDto } from "../../constants/types";

export interface RoomUpdateModalProps {
  room: RoomGetDto;
  onSuccess?: (room: RoomGetDto) => void;
}

export const RoomUpdateModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomUpdateModalProps>) => {
  const form = useForm({
    initialValues: {
      name: innerProps.room.name,
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Room name cannot be empty" : null,
    },
  });

  const handleSubmit = async (values: RoomUpdateDto) => {
    const response = await api.patch<RoomGetDto>("/rooms", values);

    if (response.data.has_errors) {
      const formErrors = response.data.errors.reduce((acc, err) => {
        if (err.property) {
          acc[err.property] = err.message;
        }
        return acc;
      }, {} as FormErrors);

      form.setErrors(formErrors);
      return;
    }

    const updatedRoom = response.data.data;

    innerProps.onSuccess?.(updatedRoom);
    context.closeModal(id);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        autoFocus
        key={form.key("name")}
        label="Room Name"
        {...form.getInputProps("name")}
      />

      <Flex justify="space-between" pt="sm">
        <Button variant="outline" onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button type="submit">Update</Button>
      </Flex>
    </form>
  );
};
