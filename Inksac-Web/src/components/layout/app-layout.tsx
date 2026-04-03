import { AppShell, Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom";
import { AppSidebar, type SidebarSlots } from "./app-sidebar";
import { AppHeader } from "./app-header";
import type { ReactNode } from "react";

type AppLayoutProps = {
  headerTitle?: string;
  headerActions?: ReactNode;
  sidebarSlots?: SidebarSlots;
  sidebarWidth?: number;
  hideActions?: boolean;
  hideUserInfo?: boolean;
  overlayNavbar?: boolean;
  bottomSlot?: ReactNode;
  bottomHeight?: number;
};

export const AppLayout = ({
  headerTitle,
  headerActions,
  sidebarSlots,
  sidebarWidth = 260,
  hideActions = false,
  hideUserInfo = false,
  overlayNavbar = false,
  bottomSlot,
  bottomHeight = 64,
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
      padding={overlayNavbar ? 0 : "md"}
      styles={
        overlayNavbar
          ? {
              main: {
                paddingLeft: 0,
              },
            }
          : undefined
      }
    >
      <AppShell.Header>
        <AppHeader
          opened={opened}
          toggle={toggle}
          title={headerTitle}
          actions={headerActions}
        />
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

      <AppShell.Main
        style={{
          position: "relative",
          height: "calc(100vh - 60px - var(--mantine-spacing-md) * 2)",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            height: bottomSlot ? `calc(100% - ${bottomHeight}px)` : "100%",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          <Outlet />
        </Box>

        {bottomSlot ? (
          <Box
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: bottomHeight,
              zIndex: 50,
            }}
          >
            {bottomSlot}
          </Box>
        ) : null}
      </AppShell.Main>
    </AppShell>
  );
};
