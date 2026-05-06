import { matchesField, useForm, type FormErrors } from "@mantine/form";
import type { ContextModalProps } from "@mantine/modals";
import {
  type UserGetDto,
  type UserCreateDto,
  type LoginDto,
} from "../../constants/types";
import api from "../../config/axios";
import { notifications } from "@mantine/notifications";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";

interface UserCreateModalProps {
  onSubmit: (logindto: LoginDto) => void;
}

const USERNAME_MAX_LENGTH = 50;

const limitUsername = (value: string) => {
  return value.slice(0, USERNAME_MAX_LENGTH);
};

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
        if (value.trim().length === 0) {
          return "Username cannot be empty";
        }

        if (value.includes(" ")) {
          return "Username cannot have spaces";
        }

        if (value.length > USERNAME_MAX_LENGTH) {
          return `Username cannot be longer than ${USERNAME_MAX_LENGTH} characters`;
        }

        return null;
      },
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      confirm_password: matchesField(
        "password",
        "Password fields do not match",
      ),
    },
  });

  const handleSubmit = async (values: UserCreateDto) => {
    const response = await api.post<UserGetDto>(`/users`, {
      ...values,
      username: limitUsername(values.username),
    });

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

      innerProps.onSubmit({
        username: values.username,
        password: values.password,
      });

      context.closeModal(id);
    }
  };

  return (
    <Box
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "28px 28px 24px",
        borderRadius: 18,
        background:
          "linear-gradient(135deg, rgba(9, 9, 11, 0.98) 0%, rgba(17, 24, 39, 0.98) 45%, rgba(5, 5, 5, 0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <ActionIcon
        variant="subtle"
        radius="xl"
        size="lg"
        onClick={() => context.closeModal(id)}
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 3,
          color: "rgba(255,255,255,0.82)",
        }}
      >
        <IconX size={18} />
      </ActionIcon>

      <Box
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(34, 139, 230, 0.18)",
          filter: "blur(26px)",
          top: -80,
          left: -70,
        }}
      />

      <Box
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "rgba(250, 82, 82, 0.12)",
          filter: "blur(26px)",
          right: -60,
          bottom: -70,
        }}
      />

      <Stack gap="lg" style={{ position: "relative", zIndex: 1 }}>
        <Stack gap={4} pr={32}>
          <Text
            size="xs"
            fw={800}
            tt="uppercase"
            style={{
              letterSpacing: 2,
              color: "#74c0fc",
            }}
          >
            Inksac
          </Text>

          <Title order={2}>Create your account</Title>

          <Text size="sm" c="dimmed">
            Start drawing with friends, save custom brushes, and create your own
            shared rooms.
          </Text>
        </Stack>

        <Divider color="rgba(255,255,255,0.10)" />

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              autoFocus
              key={form.key("username")}
              label="Username"
              placeholder="Choose a username"
              size="md"
              radius="md"
              maxLength={USERNAME_MAX_LENGTH}
              rightSection={
                <Text size="xs" c="dimmed" pr={8}>
                  {form.values.username.length}/{USERNAME_MAX_LENGTH}
                </Text>
              }
              rightSectionWidth={52}
              {...form.getInputProps("username")}
              onChange={(event) =>
                form.setFieldValue(
                  "username",
                  limitUsername(event.currentTarget.value),
                )
              }
            />

            <TextInput
              key={form.key("email")}
              label="Email"
              placeholder="you@example.com"
              size="md"
              radius="md"
              {...form.getInputProps("email")}
            />

            <PasswordInput
              key={form.key("password")}
              label="Password"
              placeholder="Create a password"
              size="md"
              radius="md"
              {...form.getInputProps("password")}
            />

            <PasswordInput
              key={form.key("confirm_password")}
              label="Confirm password"
              placeholder="Re-enter your password"
              size="md"
              radius="md"
              {...form.getInputProps("confirm_password")}
            />

            <Button
              type="submit"
              fullWidth
              size="md"
              radius="md"
              mt="xs"
              variant="gradient"
              gradient={{ from: "blue", to: "grape", deg: 135 }}
            >
              Create account
            </Button>

            <Group justify="center" gap={6}>
              <Text size="sm" c="dimmed">
                Already have an account?
              </Text>

              <Anchor size="sm" fw={700} onClick={() => context.closeModal(id)}>
                Log in
              </Anchor>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};
