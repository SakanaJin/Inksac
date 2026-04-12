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
  opened?: boolean;
  toggle?: () => void;
  rightPanel?: ReactNode;
  rightPanelWidth?: number;
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
  opened: controlledOpened,
  toggle: controlledToggle,
  rightPanel,
  rightPanelWidth = 280,
}: AppLayoutProps) => {
  const [internalOpened, { toggle: internalToggle }] = useDisclosure(false);

  const opened = controlledOpened ?? internalOpened;
  const toggle = controlledToggle ?? internalToggle;
  const effectiveRightPanelWidth = rightPanel ? rightPanelWidth : 0;
  const mainContentWidth =
    effectiveRightPanelWidth > 0
      ? `calc(100% - ${effectiveRightPanelWidth}px)`
      : "100%";

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
            position: "relative",
            width: mainContentWidth,
            height: "100%",
            overflow: "hidden",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <Box
            style={{
              height: bottomSlot ? `calc(100% - ${bottomHeight}px)` : "100%",
              overflow: "hidden",
              minHeight: 0,
              minWidth: 0,
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
        </Box>
      </AppShell.Main>

      {rightPanel ? (
        <Box
          style={{
            position: "fixed",
            top: 60,
            right: 0,
            width: effectiveRightPanelWidth,
            height: "calc(100vh - 60px)",
            borderLeft:
              effectiveRightPanelWidth > 0
                ? "1px solid rgba(255,255,255,0.08)"
                : "none",
            background:
              effectiveRightPanelWidth > 0
                ? "var(--mantine-color-dark-7)"
                : "transparent",
            zIndex: 150,
            overflow: "visible",
            pointerEvents: effectiveRightPanelWidth > 0 ? "auto" : "none",
          }}
        >
          {rightPanel}
        </Box>
      ) : null}
    </AppShell>
  );
};
