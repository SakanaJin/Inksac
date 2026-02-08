import {
  AppShell,
  Burger,
  Group,
  Title,
  Container,
  Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { RoomsList } from "./rooms-list";

export const HomePage = () => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Navbar>
        <AppSidebar />
      </AppShell.Navbar>

      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" />
          <Title order={3}>Inksac</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg">
          <Group justify="space-between" mb="md">
            <Title order={2}>Available Rooms</Title>
            <Button>Create Room</Button>
          </Group>
          <RoomsList />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};
