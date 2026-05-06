import { Stack, Text, Button, Divider, Box, Group, Paper } from "@mantine/core";
import { useAuth } from "../../authentication/use-auth";
import { modals } from "@mantine/modals";
import { EnvVars } from "../../config/env-vars";
import { AvatarOverlay } from "../user/avatar-overlay";
import { UserRole } from "../../constants/types";
import { openImageUploadModal } from "../image/upload-image-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faGear,
  faPalette,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import type { FileWithPath } from "@mantine/dropzone";

const baseurl = EnvVars.mediaBaseUrl;

export type SidebarSlots = {
  /** Fills the main vertical space — replaces default nav buttons */
  main?: React.ReactNode;
  /** Optional content pinned above the bottom action area */
  bottom?: React.ReactNode;
};

type AppSidebarProps = {
  slots?: SidebarSlots;
  hideActions?: boolean;
  hideUserInfo?: boolean;
};

export function AppSidebar({
  slots,
  hideActions = false,
  hideUserInfo = false,
}: AppSidebarProps) {
  const { logout, user, updatePfp, defaultPfp } = useAuth();
  const isGuest = user.role === UserRole.GUEST;

  const openLogoutModal = () =>
    modals.openConfirmModal({
      title: "Log out of Inksac?",
      centered: true,
      radius: "md",
      padding: "lg",
      children: (
        <Stack gap={4}>
          <Text size="sm">You’ll be returned to the login page.</Text>
        </Stack>
      ),
      labels: {
        confirm: "Log out",
        cancel: "Stay logged in",
      },
      confirmProps: {
        color: "red",
        variant: "light",
        radius: "md",
        leftSection: <FontAwesomeIcon icon={faRightFromBracket} />,
      },
      cancelProps: {
        variant: "subtle",
        color: "gray",
        radius: "md",
      },
      styles: {
        content: {
          background: "rgba(20, 24, 31, 0.98)",
        },
        header: {
          background: "rgba(20, 24, 31, 0.98)",
        },
        body: {
          background: "rgba(20, 24, 31, 0.98)",
        },
      },
      onConfirm: logout,
    });

  return (
    <Stack
      p="md"
      gap="md"
      style={{
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
        background: "rgba(20, 24, 31, 0.94)",
      }}
    >
      {!hideUserInfo && (
        <Paper
          p="md"
          radius="md"
          style={{
            background: "rgba(28, 33, 43, 0.95)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            flexShrink: 0,
          }}
        >
          <Group gap="sm" wrap="nowrap" align="center">
            <AvatarOverlay
              size="3.5rem"
              src={baseurl + user.pfp_path}
              overlay={!isGuest}
              onClick={() => {
                if (!isGuest) {
                  openImageUploadModal({
                    onUpload: (file: FileWithPath) => updatePfp(file),
                    onDefault: () => defaultPfp(),
                  });
                }
              }}
            >
              <FontAwesomeIcon icon={faCamera} />
            </AvatarOverlay>

            <Box style={{ minWidth: 0, flex: 1 }}>
              <Text fw={700} lineClamp={1}>
                {user.username}
              </Text>

              <Text size="xs" c="dimmed">
                {isGuest ? "Guest account" : "Inksac artist"}
              </Text>
            </Box>
          </Group>
        </Paper>
      )}

      {slots?.main ? (
        <Box
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {slots.main}
        </Box>
      ) : (
        <Stack gap="xs" style={{ flex: 1, minHeight: 0 }}>
          <Text
            size="xs"
            fw={800}
            tt="uppercase"
            c="dimmed"
            style={{ letterSpacing: 1.4 }}
          >
            Menu
          </Text>

          <Button
            variant="subtle"
            justify="flex-start"
            radius="md"
            color="gray"
            leftSection={<FontAwesomeIcon icon={faGear} />}
          >
            Account Settings
          </Button>

          <Button
            variant="subtle"
            justify="flex-start"
            radius="md"
            color="gray"
            leftSection={<FontAwesomeIcon icon={faPalette} />}
          >
            Preferences
          </Button>
        </Stack>
      )}

      {slots?.bottom && (
        <>
          <Divider color="rgba(255,255,255,0.08)" />
          <Stack gap="xs">{slots.bottom}</Stack>
        </>
      )}

      {!hideActions && (
        <Box style={{ flexShrink: 0 }}>
          <Divider mb="md" color="rgba(255,255,255,0.08)" />

          <Button
            color="red"
            variant="light"
            radius="md"
            fullWidth
            justify="flex-start"
            leftSection={<FontAwesomeIcon icon={faRightFromBracket} />}
            onClick={openLogoutModal}
          >
            Logout
          </Button>
        </Box>
      )}
    </Stack>
  );
}
