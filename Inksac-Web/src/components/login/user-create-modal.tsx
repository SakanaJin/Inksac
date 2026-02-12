import { matchesField, useForm, type FormErrors } from "@mantine/form";
import type { ContextModalProps } from "@mantine/modals";
import {
  type UserGetDto,
  type UserCreateDto,
  type LoginDto,
} from "../../constants/types";
import api from "../../config/axios";
import { notifications } from "@mantine/notifications";
import { Button, Flex, PasswordInput, TextInput } from "@mantine/core";

interface UserCreateModalProps {
  onSubmit: (logindto: LoginDto) => void;
}

export const UserCreateModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<UserCreateModalProps>) => {
  const form = useForm({
    validateInputOnChange: ["confirm_password"],
    initialValues: {
      username: "",
      email: "",
      password: "",
      confirm_password: "",
    },
    validate: {
      username: (value) => {
        if (value.length === 0) {
          return "username cannot be empty";
        }
        if (value.includes(" ")) {
          return "username cannot have spaces";
        }
        return null;
      },
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "invalid email"),
      confirm_password: matchesField(
        "password",
        "password fields do not match",
      ),
    },
  });

  const handleSubmit = async (values: UserCreateDto) => {
    const response = await api.post<UserGetDto>(`/users`, values);

    if (response.data.has_errors) {
      const formerrors = response.data.errors.reduce((obj, err) => {
        obj[err.property] = err.message;
        return obj;
      }, {} as FormErrors);
      form.setErrors(formerrors);
    }

    if (response.data.data) {
      notifications.show({
        title: "Success",
        message: "Successfully signed up",
        color: "green",
      });
      innerProps.onSubmit({ ...values } as LoginDto);
      context.closeModal(id);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <TextInput
        autoFocus
        key={form.key("username")}
        label="Username"
        {...form.getInputProps("username")}
      />
      <TextInput
        pt="sm"
        key={form.key("email")}
        label="Email"
        {...form.getInputProps("email")}
      />
      <PasswordInput
        pt="sm"
        key={form.key("password")}
        label="Password"
        {...form.getInputProps("password")}
      />
      <PasswordInput
        pt="sm"
        key={form.key("confirm_password")}
        label="Confirm Password"
        {...form.getInputProps("confirm_password")}
      />
      <Flex justify="space-between" pt="sm">
        <Button variant="outline" onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button type="submit">Submit</Button>
      </Flex>
    </form>
  );
};
