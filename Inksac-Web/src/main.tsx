import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { BrowserRouter as Router } from "react-router-dom";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { UserCreateModal } from "./components/login/user-create-modal.tsx";
import { ImageUploadModal } from "./components/image/upload-image-modal.tsx";
import { RoomCreateModal } from "./components/rooms/room-create-modal";
import { RoomDeleteModal } from "./components/rooms/room-delete-modal.tsx";
import { RoomUpdateModal } from "./components/rooms/room-update-modal.tsx";

const modals = {
  usercreatemodal: UserCreateModal,
  uploadimagemodal: ImageUploadModal,
  roomcreatemodal: RoomCreateModal,
  roomdeletemodal: RoomDeleteModal,
  roomupdatemodal: RoomUpdateModal,
};

declare module "@mantine/modals" {
  export interface MantineModalsOverride {
    modals: typeof modals;
  }
}

createRoot(document.getElementById("root")!).render(
  <MantineProvider defaultColorScheme="dark">
    <Notifications />
    <ModalsProvider modals={modals}>
      <Router>
        <App />
      </Router>
    </ModalsProvider>
  </MantineProvider>,
);
