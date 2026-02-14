import { Stack, Text, Button, Divider } from "@mantine/core";
import { useAuth } from "../../authentication/use-auth";
import { modals } from "@mantine/modals";
import { EnvVars } from "../../config/env-vars";
import { AvatarOverlay } from "../user/avatar-overlay";
import { type UserGetDto, UserRole } from "../../constants/types";
import { openImageUploadModal } from "../image/upload-image-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

const baseurl = EnvVars.mediaBaseUrl;

export function AppSidebar() {
  const { logout, user } = useAuth();
  const [pfp_path, setPfp_path] = useState(user.pfp_path);
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
        src={baseurl + pfp_path}
        overlay={!isguest}
        onClick={() => {
          !isguest
            ? openImageUploadModal<UserGetDto>({
                apiUrl: `/users/pfp`,
                onUpload: (updatedUser: UserGetDto) => {
                  setPfp_path(updatedUser.pfp_path);
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
