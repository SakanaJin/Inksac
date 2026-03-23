import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom";
import { AppSidebar, type SidebarSlots } from "./app-sidebar";
import { AppHeader } from "./app-header";

type AppLayoutProps = {
  headerTitle?: string;
  sidebarSlots?: SidebarSlots;
  sidebarWidth?: number;
  hideActions?: boolean;
  hideUserInfo?: boolean;
  overlayNavbar?: boolean;
};

export const AppLayout = ({
  headerTitle,
  sidebarSlots,
  sidebarWidth = 260,
  hideActions = false,
  hideUserInfo = false,
  overlayNavbar = false,
}: AppLayoutProps) => {
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: sidebarWidth,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
      styles={
        overlayNavbar
          ? {
              main: {
                paddingLeft: "var(--mantine-spacing-md)",
              },
            }
          : undefined
      }
    >
      <AppShell.Header>
        <AppHeader opened={opened} toggle={toggle} title={headerTitle} />
      </AppShell.Header>

      <AppShell.Navbar
        style={
          overlayNavbar
            ? {
                position: "fixed",
                zIndex: 200,
                top: 60,
                height: "calc(100% - 60px)",
              }
            : undefined
        }
      >
        <AppSidebar
          slots={sidebarSlots}
          hideActions={hideActions}
          hideUserInfo={hideUserInfo}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
