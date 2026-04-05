import { Stack, Text, Button, Divider, Box } from "@mantine/core";
import { useAuth } from "../../authentication/use-auth";
import { modals } from "@mantine/modals";
import { EnvVars } from "../../config/env-vars";
import { AvatarOverlay } from "../user/avatar-overlay";
import { UserRole } from "../../constants/types";
import { openImageUploadModal } from "../image/upload-image-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
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
      title: "Logout",
      children: <Text size="sm">Are you sure you want to be a quitter?</Text>,
      labels: { confirm: "Logout", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: logout,
    });

  return (
    <Stack
      p="md"
      gap="sm"
      style={{ overflow: "hidden", height: slots?.main ? "100%" : "auto" }}
    >
      {!hideUserInfo && (
        <>
          <AvatarOverlay
            size="4rem"
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
          <Text fw={500}>{user.username}</Text>
          <Divider />
        </>
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
        <Stack style={{ flex: 1 }}>
          <Button variant="subtle">Account Settings</Button>
          <Button variant="subtle">Preferences</Button>
        </Stack>
      )}

      {slots?.bottom && (
        <>
          <Divider />
          <Stack gap="xs">{slots.bottom}</Stack>
        </>
      )}

      {!hideActions && (
        <>
          <Divider />
          <Button color="red" variant="light" onClick={openLogoutModal}>
            Logout
          </Button>
        </>
      )}
    </Stack>
  );
}
