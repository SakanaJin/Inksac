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
  leftPanel?: ReactNode;
  leftPanelWidth?: number;
  leftOverlaySlot?: ReactNode;
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
  leftPanel,
  leftPanelWidth = 280,
  leftOverlaySlot,
  rightPanel,
  rightPanelWidth = 280,
}: AppLayoutProps) => {
  const [internalOpened, { toggle: internalToggle }] = useDisclosure(false);

  const opened = controlledOpened ?? internalOpened;
  const toggle = controlledToggle ?? internalToggle;

  const showNavbar = !leftPanel;
  const effectiveLeftPanelWidth = leftPanel ? leftPanelWidth : 0;
  const effectiveRightPanelWidth = rightPanel ? rightPanelWidth : 0;
  const mainContentWidth =
    effectiveLeftPanelWidth > 0 || effectiveRightPanelWidth > 0
      ? `calc(100% - ${effectiveLeftPanelWidth + effectiveRightPanelWidth}px)`
      : "100%";
  const mainContentLeft =
    effectiveLeftPanelWidth > 0 ? effectiveLeftPanelWidth : 0;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={
        showNavbar
          ? {
              width: sidebarWidth,
              breakpoint: "sm",
              collapsed: { mobile: !opened, desktop: !opened },
            }
          : undefined
      }
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

      {showNavbar ? (
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
      ) : null}

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
            left: mainContentLeft,
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

        {leftOverlaySlot ? (
          <Box
            style={{
              position: "fixed",
              top: 60,
              left: 0,
              height: "calc(100vh - 60px)",
              zIndex: 175,
              pointerEvents: "none",
            }}
          >
            {leftOverlaySlot}
          </Box>
        ) : null}
      </AppShell.Main>

      {leftPanel ? (
        <Box
          style={{
            position: "fixed",
            top: 60,
            left: 0,
            width: effectiveLeftPanelWidth,
            height: "calc(100vh - 60px)",
            borderRight:
              effectiveLeftPanelWidth > 0
                ? "1px solid rgba(255,255,255,0.08)"
                : "none",
            background:
              effectiveLeftPanelWidth > 0
                ? "var(--mantine-color-dark-7)"
                : "transparent",
            zIndex: 150,
            overflow: "visible",
            pointerEvents: effectiveLeftPanelWidth > 0 ? "auto" : "none",
          }}
        >
          {leftPanel}
        </Box>
      ) : null}

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
