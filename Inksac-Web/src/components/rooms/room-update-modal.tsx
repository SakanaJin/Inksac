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

const limitRoomName = (value: string) => {
  return value.slice(0, 255);
};

export const RoomUpdateModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomUpdateModalProps>) => {
  const form = useForm({
    initialValues: {
      name: limitRoomName(innerProps.room.name),
    },
    validate: {
      name: (value) => {
        if (value.trim().length === 0) {
          return "Room name cannot be empty";
        }

        if (value.length > 255) {
          return "Room name cannot be longer than 255 characters";
        }

        return null;
      },
    },
  });

  const handleSubmit = async (values: RoomUpdateDto) => {
    const response = await api.patch<RoomGetDto>("/rooms", {
      ...values,
      name: limitRoomName(values.name),
    });

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

    notifications.show({
      title: "Success",
      message: "Room updated Successfully!",
      color: "green",
    });

    innerProps.onSuccess?.(updatedRoom);
    context.closeModal(id);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        autoFocus
        key={form.key("name")}
        label="Room Name"
        placeholder="Enter room name"
        maxLength={255}
        description={`${form.values.name.length}/255 characters`}
        {...form.getInputProps("name")}
        onChange={(event) =>
          form.setFieldValue("name", limitRoomName(event.currentTarget.value))
        }
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
