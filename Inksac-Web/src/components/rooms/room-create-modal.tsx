import {
  TextInput,
  Button,
  Flex,
  NumberInput,
  Stack,
  Text,
  Group,
  ActionIcon,
  ColorInput,
  Paper,
  Divider,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import { type RoomGetDto, type RoomCreateDto } from "../../constants/types";
import { useForm, type FormErrors } from "@mantine/form";
import { useState } from "react";
import { IconX, IconPhoto } from "@tabler/icons-react";
import type { FileWithPath } from "@mantine/dropzone";

export interface RoomCreateModalProps {
  onSuccess?: (room: RoomGetDto) => void;
  defaultRoomName: string;
}

const getImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
};

const getFileNameWithoutExtension = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return filename;
  }

  return filename.slice(0, lastDotIndex);
};

export const RoomCreateModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<RoomCreateModalProps>) => {
  const [selectedFile, setSelectedFile] = useState<FileWithPath | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      name: innerProps.defaultRoomName,
      width: 1920,
      height: 1080,
      canvas_color: "#f0f0f0",
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Room name cannot be empty" : null,
      width: (value) => {
        if (!value || value < 256) {
          return `Width must be at least ${256}`;
        }
        if (value > 8192) {
          return `Width cannot be greater than ${8192}`;
        }
        return null;
      },
      height: (value) => {
        if (!value || value < 256) {
          return `Height must be at least ${256}`;
        }
        if (value > 8192) {
          return `Height cannot be greater than ${8192}`;
        }
        return null;
      },
      canvas_color: (value) =>
        value.trim().length === 0 ? "Canvas color cannot be empty" : null,
    },
  });

  const clearSelectedFile = () => {
    setSelectedFile(null);

    form.setFieldValue("width", 2000);
    form.setFieldValue("height", 2000);
    form.setFieldValue("name", innerProps.defaultRoomName);
  };

  const handleFileChange = async (file: FileWithPath | null) => {
    setSelectedFile(null);

    if (!file) return;

    setLoadingImage(true);

    try {
      const { width, height } = await getImageDimensions(file);

      if (width > 8192 || height > 8192) {
        notifications.show({
          title: "Error",
          message: `Imported image cannot be larger than ${8192} x ${8192}`,
          color: "red",
        });
        return;
      }

      if (width < 256 || height < 256) {
        notifications.show({
          title: "Error",
          message: `Imported image must be at least ${256} x ${256}`,
          color: "red",
        });
        return;
      }

      form.setFieldValue("name", getFileNameWithoutExtension(file.name));
      form.setFieldValue("width", width);
      form.setFieldValue("height", height);
      setSelectedFile(file);
    } catch {
      notifications.show({
        title: "Error",
        message: "Could not read image dimensions",
        color: "red",
      });
    } finally {
      setLoadingImage(false);
    }
  };

  const handleSubmit = async (values: RoomCreateDto) => {
    setSubmitting(true);

    try {
      const response = await api.post<RoomGetDto>("/rooms", values);

      if (response.data.has_errors) {
        const formErrors = response.data.errors.reduce((acc, err) => {
          if (err.property) {
            acc[err.property] = err.message;
          }
          return acc;
        }, {} as FormErrors);

        form.setErrors(formErrors);
        return;
      }

      let createdRoom = response.data.data;

      if (selectedFile) {
        const imageResponse = await api.patchf<RoomGetDto>(
          `/rooms/${createdRoom.id}/imgurl`,
          selectedFile,
        );

        if (imageResponse.data.has_errors) {
          notifications.show({
            title: "Room created",
            message:
              "The room was created, but the imported image could not be uploaded.",
            color: "yellow",
          });
        } else {
          createdRoom = imageResponse.data.data;
        }
      }

      notifications.show({
        title: "Success",
        message: "Room Created! Welcome to your canvas!",
        color: "green",
      });

      innerProps.onSuccess?.(createdRoom);
      context.closeModal(id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          autoFocus
          key={form.key("name")}
          label="Room Name"
          placeholder="Enter room name"
          {...form.getInputProps("name")}
        />

        <Divider />

        <Stack gap="xs">
          <Text fw={600} size="sm">
            Starting Image
          </Text>

          <Button variant="light" component="label" loading={loadingImage}>
            Import PNG or JPG
            <input
              hidden
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] as
                  | FileWithPath
                  | undefined;
                void handleFileChange(file ?? null);
              }}
            />
          </Button>

          {selectedFile ? (
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon variant="light" size="md">
                    <IconPhoto size={16} />
                  </ThemeIcon>
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {selectedFile.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Dimensions were applied automatically
                    </Text>
                  </Stack>
                </Group>

                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={clearSelectedFile}
                  aria-label="Remove imported image"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ) : (
            <></>
          )}
        </Stack>

        <Divider />

        <Stack gap="xs">
          <Text fw={600} size="sm">
            Canvas Setup
          </Text>

          <SimpleGrid cols={2} spacing="sm">
            <NumberInput
              key={form.key("width")}
              label="Width"
              suffix="px"
              min={256}
              max={8192}
              allowDecimal={false}
              clampBehavior="blur"
              disabled={!!selectedFile}
              {...form.getInputProps("width")}
            />

            <NumberInput
              key={form.key("height")}
              label="Height"
              suffix="px"
              min={256}
              max={8192}
              allowDecimal={false}
              clampBehavior="blur"
              disabled={!!selectedFile}
              {...form.getInputProps("height")}
            />
          </SimpleGrid>

          <ColorInput
            key={form.key("canvas_color")}
            label="Canvas Color"
            placeholder="Pick canvas color"
            swatches={[
              "#ffffff",
              "#f0f0f0",
              "#808080",
              "#2e2e2e",
              "#000000",
              "#fdf6e3",
            ]}
            {...form.getInputProps("canvas_color")}
          />
        </Stack>

        <Flex justify="space-between" pt="xs">
          <Button variant="default" onClick={() => context.closeModal(id)}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting || loadingImage}>
            Create Room
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};
