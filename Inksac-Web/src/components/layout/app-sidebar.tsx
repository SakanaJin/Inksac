import { Stack, Avatar, Text, Button, Divider } from "@mantine/core";
import { useAuth } from "../../authentication/use-auth";
import { modals } from "@mantine/modals";

export function AppSidebar() {
  const { logout } = useAuth();

  const openLogoutModal = () =>
    modals.openConfirmModal({
      title: "Logout",
      children: <Text size="sm">Are you sure you want to be a quitter?</Text>,
      labels: { confirm: "Logout", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: logout,
    });
  return (
    <Stack p="md">
      <Avatar radius="xl" size="lg" />
      <Text fw={500}>John Doe</Text>
      <Text size="sm" c="dimmed">
        john@inksac.dev
      </Text>

      <Divider my="sm" />

      <Button variant="subtle">Account Settings</Button>
      <Button variant="subtle">Preferences</Button>

      <Divider my="sm" />

      <Button color="red" variant="light" onClick={openLogoutModal}>
        Logout
      </Button>
    </Stack>
  );
}
