import { TextInput, Button, Flex } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import { type RoomGetDto, type RoomCreateDto } from "../../constants/types";
import { useForm, type FormErrors } from "@mantine/form";

export interface RoomCreateModalProps {
  onSuccess?: (room: RoomGetDto) => void;
}

export const RoomCreateModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomCreateModalProps>) => {
  const form = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Room name cannot be empty" : null,
    },
  });

  const handleSubmit = async (values: RoomCreateDto) => {
    const response = await api.post<RoomGetDto>("/rooms", values);

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
        message: "Room created successfully",
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
        placeholder="Enter room name"
        {...form.getInputProps("name")}
      />

      <Flex justify="space-between" pt="sm">
        <Button variant="outline" onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </Flex>
    </form>
  );
};
