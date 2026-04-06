import { useState } from "react";
import { useForm, type FormErrors } from "@mantine/form";
import type { ContextModalProps } from "@mantine/modals";
import {
  Box,
  Button,
  Group,
  Image,
  NumberInput,
  Paper,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { FileWithPath } from "@mantine/dropzone";
import api from "../../config/axios";
import { EnvVars } from "../../config/env-vars";
import {
  RotationMode,
  type BrushCreateDto,
  type BrushGetDto,
  type BrushUpdateDto,
} from "../../constants/types";

interface BrushEditorModalProps {
  brush?: BrushGetDto;
  onSubmit: (brush: BrushGetDto) => void;
}

const baseurl = EnvVars.mediaBaseUrl;

function SettingBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      {children}
    </Stack>
  );
}

export const BrushEditorModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<BrushEditorModalProps>) => {
  const brush = innerProps.brush;
  const isEdit = !!brush;

  const [selectedFile, setSelectedFile] = useState<FileWithPath | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    initialValues: {
      name: brush?.name ?? "",
      spacing: brush?.spacing ?? 1,
      rotation_mode: brush?.rotation_mode ?? RotationMode.NONE,
    },
    validate: {
      name: (value) => {
        if (value.length === 0) {
          return "name cannot be empty";
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setSaving(true);

    try {
      let response;

      if (isEdit && brush) {
        const dto: BrushUpdateDto = {
          name: values.name,
          spacing: values.spacing,
          rotation_mode: values.rotation_mode,
        };

        response = await api.patch<BrushGetDto>(`/brushes/${brush.id}`, dto);
      } else {
        const dto: BrushCreateDto = {
          name: values.name,
          spacing: values.spacing,
          rotation_mode: values.rotation_mode,
        };

        response = await api.post<BrushGetDto>("/brushes", dto);
      }

      if (response.data.has_errors) {
        const formerrors = response.data.errors.reduce((obj, err) => {
          obj[err.property] = err.message;
          return obj;
        }, {} as FormErrors);

        form.setErrors(formerrors);
        return;
      }

      let savedBrush = response.data.data;

      if (savedBrush && selectedFile) {
        const imageResponse = await api.patchf<BrushGetDto>(
          `/brushes/${savedBrush.id}/imgurl`,
          selectedFile,
        );

        if (!imageResponse.data.has_errors && imageResponse.data.data) {
          savedBrush = imageResponse.data.data;
        }
      }

      if (savedBrush) {
        notifications.show({
          title: isEdit ? "Brush updated" : "Brush created",
          message: "Saved",
          color: "green",
        });

        innerProps.onSubmit(savedBrush);
        context.closeModal(id);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} style={{ overflow: "hidden" }}>
      <Stack gap="md" style={{ overflow: "hidden" }}>
        <Stack gap="xs">
          <Group
            align="flex-start"
            wrap="nowrap"
            style={{ overflow: "hidden" }}
          >
            <Paper
              withBorder
              radius={0}
              p="xs"
              bg="#303030"
              style={{ width: 150, flexShrink: 0 }}
            >
              <Stack gap="xs">
                <Box
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    background: "#1f1f1f",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={
                      selectedFile
                        ? URL.createObjectURL(selectedFile)
                        : baseurl +
                          (brush?.imgurl ?? "/user/brush/softShape.png")
                    }
                    alt={form.values.name || "Brush preview"}
                    fit="contain"
                    radius={0}
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>

                <Button variant="outline" radius={0} component="label">
                  Choose Image
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (file) {
                        setSelectedFile(file as FileWithPath);
                      }
                    }}
                  />
                </Button>

                {selectedFile ? (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {selectedFile.name}
                  </Text>
                ) : null}
              </Stack>
            </Paper>
            <Stack style={{ flex: 1, minWidth: 0 }} gap="md">
              <SettingBlock label="Name">
                <TextInput
                  radius={0}
                  key={form.key("name")}
                  {...form.getInputProps("name")}
                />
              </SettingBlock>

              <SettingBlock label="Spacing">
                <Group wrap="nowrap" align="center">
                  <Slider
                    style={{ flex: 1 }}
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.values.spacing}
                    onChange={(value) => form.setFieldValue("spacing", value)}
                  />
                  <NumberInput
                    radius={0}
                    w={90}
                    min={0}
                    max={100}
                    step={0.1}
                    key={form.key("spacing")}
                    {...form.getInputProps("spacing")}
                  />
                </Group>
              </SettingBlock>

              <SettingBlock label="Rotation Mode">
                <Select
                  radius={0}
                  data={[
                    { value: RotationMode.NONE, label: "None" },
                    { value: RotationMode.RANDOM, label: "Random" },
                    {
                      value: RotationMode.FOLLOWSTROKE,
                      label: "Follow stroke",
                    },
                  ]}
                  key={form.key("rotation_mode")}
                  {...form.getInputProps("rotation_mode")}
                />
              </SettingBlock>
            </Stack>
          </Group>
        </Stack>

        <Group justify="space-between">
          <Button
            variant="outline"
            radius={0}
            onClick={() => context.closeModal(id)}
          >
            Cancel
          </Button>
          <Button type="submit" radius={0} loading={saving}>
            {isEdit ? "Save" : "Create"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
