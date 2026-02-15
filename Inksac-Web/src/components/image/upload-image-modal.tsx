import {
  Dropzone,
  IMAGE_MIME_TYPE,
  type FileWithPath,
} from "@mantine/dropzone";
import { modals, type ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import type { ApiResponse } from "../../constants/types";
import { notifications } from "@mantine/notifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faImage, faX } from "@fortawesome/free-solid-svg-icons";
import { Button, Flex } from "@mantine/core";

interface ImageUploadProps<T> {
  __type?: T;
  apiUrl: string;
  onUpload: (updatedItem: T) => void;
}

export function openImageUploadModal<T>(props: ImageUploadProps<T>) {
  modals.openContextModal({
    modal: "uploadimagemodal",
    title: "Upload Image",
    centered: true,
    innerProps: props as ImageUploadProps<unknown>,
  });
}

export const ImageUploadModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<ImageUploadProps<unknown>>) => {
  const handleDrop = async (file: FileWithPath) => {
    const response = await api.patchf<ApiResponse<unknown>>(
      innerProps.apiUrl,
      file,
    );

    if (response.data.has_errors) {
      notifications.show({
        title: "Error",
        message: "Error uploading image",
        color: "red",
      });
    }

    if (response.data.data) {
      innerProps.onUpload(response.data.data);
      context.closeModal(id);
    }
  };

  const setDefault = async () => {
    const response = await api.delete<ApiResponse<unknown>>(innerProps.apiUrl);

    if (response.data.has_errors) {
      notifications.show({
        title: "Error",
        message: "Error reverting to default image",
        color: "red",
      });
    }

    if (response.data.data) {
      innerProps.onUpload(response.data.data);
      context.closeModal(id);
    }
  };

  return (
    <>
      <Dropzone
        maxFiles={1}
        onDrop={(files) => handleDrop(files[0])}
        onReject={() => {
          notifications.show({
            title: "Rejected",
            message: "File Rejected",
            color: "red",
          });
        }}
        maxSize={5 * 1024 ** 2} //5MB
        accept={IMAGE_MIME_TYPE}
        h="500px"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: "0.25rem",
        }}
      >
        <Dropzone.Accept>
          <FontAwesomeIcon icon={faCheck} size="5x" />
        </Dropzone.Accept>
        <Dropzone.Idle>
          <FontAwesomeIcon icon={faImage} size="5x" />
        </Dropzone.Idle>
        <Dropzone.Reject>
          <FontAwesomeIcon icon={faX} size="5x" />
        </Dropzone.Reject>
      </Dropzone>
      <Flex justify="center" py="10px">
        <Button onClick={() => setDefault()}>Set Default</Button>
      </Flex>
    </>
  );
};
