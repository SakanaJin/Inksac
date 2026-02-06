import type { LoginDto } from "../constants/types";
import { useForm, type FormErrors } from "@mantine/form";
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

export const LoginPage = ({ fetchCurrentUser }) => {
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
    const response = await api.post(`/auth/login`, values);

    if (response.data?.has_errors) {
      const formerrors = response.data.errors.reduce(
        (obj: FormErrors, err: any) => {
          obj[err.property] = err.message;
          return obj;
        },
        {},
      );
      form.setErrors(formerrors);
      return;
    }

    if (response.data?.data) {
      await fetchCurrentUser();
    }
  };

  return (
    <Center style={{ width: "100vw", height: "100vh" }}>
      <Paper shadow="sm" withBorder p="xl">
        <Title size="h2">Login</Title>
        <Space h="md" />
        <form onSubmit={form.onSubmit(submitLogin)}>
          <TextInput label="Username" {...form.getInputProps("username")} />
          <Space h="md" />
          <PasswordInput label="Password" {...form.getInputProps("password")} />
          <Space h="md" />
          <Button type="submit" fullWidth>
            Login
          </Button>
        </form>
      </Paper>
    </Center>
  );
};
