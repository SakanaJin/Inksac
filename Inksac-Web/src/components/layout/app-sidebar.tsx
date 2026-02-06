import { Stack, Avatar, Text, Button, Divider } from "@mantine/core";

export function AppSidebar() {
  return (
    <Stack p="md">
      <Avatar radius="xl" size="lg" />
      <Text fw={500}>John Doe</Text>
      <Text size="sm" c="dimmed">
        john@inkasc.dev
      </Text>

      <Divider my="sm" />

      <Button variant="subtle">Account Settings</Button>
      <Button variant="subtle">Preferences</Button>

      <Divider my="sm" />

      <Button color="red" variant="light">
        Logout
      </Button>
    </Stack>
  );
}
