import { Stack, Text, Button, Divider } from "@mantine/core";
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

export function AppSidebar() {
  const { logout, user, updatePfp, defaultPfp } = useAuth();
  const isguest = user.role === UserRole.GUEST;

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
      <AvatarOverlay
        size="4rem"
        src={baseurl + user.pfp_path}
        overlay={!isguest}
        onClick={() => {
          !isguest
            ? openImageUploadModal({
                onUpload: (file: FileWithPath) => {
                  return updatePfp(file);
                },
                onDefault: () => {
                  return defaultPfp();
                },
              })
            : {};
        }}
      >
        <FontAwesomeIcon icon={faCamera} />
      </AvatarOverlay>
      <Text fw={500}>{user.username}</Text>

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
