import {
  Dropzone,
  IMAGE_MIME_TYPE,
  type FileWithPath,
} from "@mantine/dropzone";
import { modals, type ContextModalProps } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faImage, faX } from "@fortawesome/free-solid-svg-icons";
import { Box, Button, Flex, Stack, Text, Title } from "@mantine/core";

interface ImageUploadProps {
  onUpload: (file: FileWithPath) => boolean;
  onDefault: () => boolean;
}

export function openImageUploadModal(props: ImageUploadProps) {
  modals.openContextModal({
    modal: "uploadimagemodal",
    title: "Upload Image",
    centered: true,
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
    innerProps: props as ImageUploadProps,
  });
}

export const ImageUploadModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<ImageUploadProps>) => {
  const handleDrop = async (file: FileWithPath) => {
    const success = innerProps.onUpload(file);
    if (success) {
      context.closeModal(id);
    }
  };

  const setDefault = async () => {
    const success = innerProps.onDefault();
    if (success) {
      context.closeModal(id);
    }
  };

  return (
    <Stack gap="md">
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
        maxSize={5 * 1024 ** 2}
        accept={IMAGE_MIME_TYPE}
        h={360}
        radius="md"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: "rgba(116, 192, 252, 0.45)",
          background: "rgba(28, 33, 43, 0.96)",
          transition: "all 150ms ease",
        }}
      >
        <Dropzone.Accept>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 78,
                height: 78,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(81, 207, 102, 0.14)",
                color: "#69db7c",
              }}
            >
              <FontAwesomeIcon icon={faCheck} size="3x" />
            </Box>

            <Title order={3}>Drop image here</Title>
            <Text size="sm" c="dimmed">
              Release to upload your new profile picture.
            </Text>
          </Stack>
        </Dropzone.Accept>

        <Dropzone.Idle>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 78,
                height: 78,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(116, 192, 252, 0.12)",
                color: "#74c0fc",
              }}
            >
              <FontAwesomeIcon icon={faImage} size="3x" />
            </Box>

            <Title order={3}>Upload an image</Title>

            <Text size="sm" c="dimmed" ta="center" maw={280}>
              Drag and drop an image here, or click to browse your files.
            </Text>

            <Text size="xs" c="dimmed">
              PNG, JPG, GIF, or WebP up to 5 MB
            </Text>
          </Stack>
        </Dropzone.Idle>

        <Dropzone.Reject>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 78,
                height: 78,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(250, 82, 82, 0.14)",
                color: "#ff8787",
              }}
            >
              <FontAwesomeIcon icon={faX} size="3x" />
            </Box>

            <Title order={3}>File rejected</Title>
            <Text size="sm" c="dimmed">
              Please choose a valid image under 5 MB.
            </Text>
          </Stack>
        </Dropzone.Reject>
      </Dropzone>

      <Flex justify="center">
        <Button variant="light" color="gray" radius="md" onClick={setDefault}>
          Use default image
        </Button>
      </Flex>
    </Stack>
  );
};
