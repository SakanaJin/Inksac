import type { LoginDto } from "../constants/types";
import { useForm, type FormErrors } from "@mantine/form";
import {
  Anchor,
  Button,
  Center,
  Paper,
  PasswordInput,
  Space,
  TextInput,
  Title,
} from "@mantine/core";
import api from "../config/axios";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

export const LoginPage = ({ fetchCurrentUser }) => {
  const form = useForm<LoginDto>({
    initialValues: {
      username: "",
      password: "",
    },
    validate: {
      username: (value) => (value.length <= 0 ? " " : null),
      password: (value) => (value.length <= 0 ? " " : null),
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

  const continueAsGuest = async () => {
    const response = await api.post<boolean>(`/auth/guest`);

    if (response.data.has_errors) {
      notifications.show({
        title: "Error",
        message: "Cannot make guest account at this time",
        color: "red",
      });
    }

    if (response.data.data) {
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
        <Space h="sm" />
        <Anchor
          onClick={() => {
            modals.openContextModal({
              modal: "usercreatemodal",
              title: "Sign Up",
              centered: true,
              innerProps: {
                onSubmit: (logindto: LoginDto) => submitLogin(logindto),
              },
            });
          }}
        >
          Sign Up
        </Anchor>
        <Space h="sm" />
        <Anchor onClick={() => continueAsGuest()}>Continue as Guest</Anchor>
      </Paper>
    </Center>
  );
};
