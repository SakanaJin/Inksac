import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { Outlet } from "react-router-dom";

export const AppLayout = () => {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
    >
      <AppShell.Navbar>
        <AppSidebar />
      </AppShell.Navbar>

      <AppShell.Header>
        <AppHeader opened={opened} toggle={toggle} />
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
