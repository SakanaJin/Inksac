import { TextInput, Button, Flex, NumberInput } from "@mantine/core";
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
      width: 2000,
      height: 2000,
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Room name cannot be empty" : null,
      width: (value) =>
        !value || value <= 0 ? "Width must be greater than 0" : null,
      height: (value) =>
        !value || value <= 0 ? "Height must be greater than 0" : null,
    },
  });

  const handleSubmit = async (values: RoomCreateDto) => {
    const response = await api.post<RoomGetDto>("/rooms", values);

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

    const createdRoom = response.data.data;

    notifications.show({
      title: "Success",
      message: "Room Created! Welcome to your canvas!",
      color: "green",
    });

    innerProps.onSuccess?.(createdRoom);
    context.closeModal(id);
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

      <NumberInput
        key={form.key("width")}
        label="Canvas Width"
        min={1}
        allowDecimal={false}
        clampBehavior="strict"
        mt="sm"
        {...form.getInputProps("width")}
      />

      <NumberInput
        key={form.key("height")}
        label="Canvas Height"
        min={1}
        allowDecimal={false}
        clampBehavior="strict"
        mt="sm"
        {...form.getInputProps("height")}
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
