import {
  TextInput,
  Button,
  Flex,
  NumberInput,
  Stack,
  Text,
  Group,
  ActionIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ContextModalProps } from "@mantine/modals";
import api from "../../config/axios";
import { type RoomGetDto, type RoomCreateDto } from "../../constants/types";
import { useForm, type FormErrors } from "@mantine/form";
import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import type { FileWithPath } from "@mantine/dropzone";

export interface RoomCreateModalProps {
  onSuccess?: (room: RoomGetDto) => void;
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
      name: "",
      width: 2000,
      height: 2000,
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
    },
  });

  const clearSelectedFile = () => {
    setSelectedFile(null);

    form.setFieldValue("width", 2000);
    form.setFieldValue("height", 2000);
    form.setFieldValue("name", "");
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
      <Stack gap="sm">
        <TextInput
          autoFocus
          key={form.key("name")}
          label="Room Name"
          placeholder="Enter room name"
          {...form.getInputProps("name")}
        />

        <Button variant="outline" component="label" loading={loadingImage}>
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
          <Group justify="space-between" gap="xs">
            <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 0 }}>
              {selectedFile.name}
            </Text>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={clearSelectedFile}
              aria-label="Remove imported image"
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>
        ) : null}

        <NumberInput
          key={form.key("width")}
          label="Canvas Width"
          min={256}
          max={8192}
          allowDecimal={false}
          clampBehavior="blur"
          mt="sm"
          disabled={!!selectedFile}
          {...form.getInputProps("width")}
        />

        <NumberInput
          key={form.key("height")}
          label="Canvas Height"
          min={256}
          max={8192}
          allowDecimal={false}
          clampBehavior="blur"
          mt="sm"
          disabled={!!selectedFile}
          {...form.getInputProps("height")}
        />

        <Flex justify="space-between" pt="sm">
          <Button variant="outline" onClick={() => context.closeModal(id)}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting || loadingImage}>
            Create
          </Button>
        </Flex>
      </Stack>
    </form>
  );
};
