import type { LoginDto } from "../constants/types";
import { useForm, type FormErrors } from "@mantine/form";
import {
  Anchor,
  Box,
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Space,
  Stack,
  Text,
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
    <Box
      style={{
        minHeight: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 20% 20%, rgba(89, 160, 255, 0.28), transparent 30%), radial-gradient(circle at 80% 10%, rgba(217, 70, 239, 0.22), transparent 28%), radial-gradient(circle at 55% 85%, rgba(34, 197, 94, 0.14), transparent 30%), linear-gradient(135deg, #09090b 0%, #111827 45%, #050505 100%)",
      }}
    >
      <Box
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "rgba(34, 139, 230, 0.18)",
          filter: "blur(30px)",
          top: -120,
          left: -120,
        }}
      />

      <Box
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: "rgba(250, 82, 82, 0.14)",
          filter: "blur(34px)",
          bottom: -110,
          right: -80,
        }}
      />

      <Center style={{ minHeight: "100vh", padding: 24 }}>
        <Group
          gap={64}
          align="center"
          justify="center"
          style={{
            width: "100%",
            maxWidth: 950,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Stack
            gap="lg"
            style={{
              flex: "1 1 430px",
              maxWidth: 520,
            }}
          >
            <Box>
              <Text
                size="sm"
                fw={700}
                tt="uppercase"
                style={{
                  letterSpacing: 2,
                  color: "#74c0fc",
                }}
              >
                Inksac
              </Text>

              <Title
                order={1}
                mt="sm"
                style={{
                  fontSize: "clamp(2.4rem, 6vw, 4.8rem)",
                  lineHeight: 0.95,
                  letterSpacing: -2,
                }}
              >
                Create together.
                <br />
                Draw in real time.
              </Title>

              <Text size="lg" c="dimmed" mt="md" maw={440}>
                Join a shared room, pick a brush, and start making art with
                friends instantly.
              </Text>
            </Box>
          </Stack>

          <Paper
            shadow="xl"
            withBorder
            radius="xl"
            p="xl"
            style={{
              width: "100%",
              maxWidth: 390,
              flex: "0 1 390px",
              background: "rgba(15, 23, 42, 0.78)",
              borderColor: "rgba(255,255,255,0.13)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 24px 90px rgba(0,0,0,0.45)",
            }}
          >
            <Stack gap="xs" mb="lg">
              <Title order={2}>Welcome back</Title>
              <Text c="dimmed" size="sm">
                Log in to keep drawing, sharing, and creating.
              </Text>
            </Stack>

            <form onSubmit={form.onSubmit(submitLogin)}>
              <TextInput
                label="Username"
                placeholder="your username"
                size="md"
                radius="md"
                {...form.getInputProps("username")}
              />

              <Space h="md" />

              <PasswordInput
                label="Password"
                placeholder="your password"
                size="md"
                radius="md"
                {...form.getInputProps("password")}
              />

              <Space h="lg" />

              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                variant="gradient"
                gradient={{ from: "blue", to: "grape", deg: 135 }}
              >
                Login
              </Button>
            </form>

            <Space h="md" />

            <Button
              fullWidth
              size="md"
              radius="md"
              variant="light"
              onClick={() => continueAsGuest()}
            >
              Continue as Guest
            </Button>

            <Space h="md" />

            <Group justify="center" gap={6}>
              <Text size="sm" c="dimmed">
                New here?
              </Text>

              <Anchor
                size="sm"
                fw={700}
                onClick={() => {
                  modals.openContextModal({
                    modal: "usercreatemodal",
                    centered: true,
                    withCloseButton: false,
                    padding: 0,
                    radius: "lg",
                    size: 460,
                    styles: {
                      content: {
                        background: "transparent",
                        boxShadow: "none",
                      },
                      body: {
                        padding: 0,
                        background: "transparent",
                      },
                    },
                    innerProps: {
                      onSubmit: (logindto: LoginDto) => submitLogin(logindto),
                    },
                  });
                }}
              >
                Create an account
              </Anchor>
            </Group>
          </Paper>
        </Group>
      </Center>
    </Box>
  );
};
