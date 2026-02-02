import type { LoginDto } from "../constants/types";
import { useForm } from "@mantine/form";
import type { FormErrors } from "@mantine/form";
import {
  Button,
  Center,
  Paper,
  PasswordInput,
  Space,
  TextInput,
  Title,
} from "@mantine/core";
import api from "../config/axios";

export const LoginPage = ({
  fetchCurrentUser,
}: {
  fetchCurrentUser: () => void;
}) => {
  const form = useForm<LoginDto>({
    initialValues: {
      username: "",
      password: "",
    },
    validate: {
      username: (value) =>
        value.length <= 0 ? "Username must not be empty" : null,
      password: (value) =>
        value.length <= 0 ? "Password must not be empty" : null,
    },
  });

  const submitLogin = async (values: LoginDto) => {
    const response = await api.post<boolean>(`/auth/login`, values);
    if (response.data.has_errors) {
      const formerrors = response.data.errors.reduce((obj, err) => {
        obj[err.property] = err.message;
        return obj;
      }, {} as FormErrors);
      form.setErrors(formerrors);
    }

    if (response.data.data) {
      fetchCurrentUser();
    }
  };

  return (
    <Center style={{ width: "100vw", height: "100vh" }}>
      <Paper shadow="sm" withBorder p="xl">
        <Title size="h2">Login</Title>
        <Space h="md" />
        <form onSubmit={form.onSubmit(submitLogin)}>
          <label htmlFor="userName">Username</label>
          <TextInput
            key={form.key("username")}
            {...form.getInputProps("username")}
            style={{ width: "12vw" }}
          />
          <Space h="md" />
          <label htmlFor="password">Password</label>
          <PasswordInput
            key={form.key("password")}
            {...form.getInputProps("password")}
          />
          <Space h="md" />
          <Button type="submit">Login</Button>
        </form>
      </Paper>
    </Center>
  );
};
