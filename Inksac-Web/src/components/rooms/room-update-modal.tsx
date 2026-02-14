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
      const formErrors = response.data.errors.reduce((obj, err) => {
        if (err.property) {
          obj[err.property] = err.message;
        } else {
          notifications.show({
            title: "Error",
            message: err.message,
            color: "red",
          });
        }
        return obj;
      }, {} as FormErrors);

      form.setErrors(formErrors);
      return;
    }

    if (response.data.data) {
      notifications.show({
        title: "Success",
        message: "Room updated successfully",
        color: "green",
      });

      innerProps.onSuccess?.(response.data.data);
      context.closeModal(id);
    }
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
