import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FormErrors } from "@mantine/form";
import type { ContextModalProps } from "@mantine/modals";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Image,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { FileWithPath } from "@mantine/dropzone";
import {
  IconRotateClockwise2,
  IconRotate2,
  IconFlipHorizontal,
  IconFlipVertical,
} from "@tabler/icons-react";
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBrushSpacingPx(brushSpacingPercent: number, brushScale: number) {
  const clampedPercent = clamp(brushSpacingPercent, 1, 100);
  const rawSpacing = (brushScale * clampedPercent) / 100;
  return Math.max(brushScale * 0.01, rawSpacing, 1);
}

function getDeterministicRandomUnit(x: number, y: number, index: number) {
  const raw = Math.sin(x * 12.9898 + y * 78.233 + index * 37.719) * 43758.5453;
  return raw - Math.floor(raw);
}

function getRandomRotationAngle(
  x: number,
  y: number,
  index: number,
  jitterPercent: number,
) {
  const clampedJitter = clamp(jitterPercent, 0, 100);
  const maxAngle = (Math.PI * 2 * clampedJitter) / 100;
  const unit = getDeterministicRandomUnit(x, y, index);
  return (unit - 0.5) * maxAngle;
}

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const size = 12;

  ctx.fillStyle = "#252525";
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const even = (x / size + y / size) % 2 === 0;
      ctx.fillStyle = even ? "#2b2b2b" : "#313131";
      ctx.fillRect(x, y, size, size);
    }
  }
}

type TransformSettings = {
  rotationDeg: number;
  flipX: boolean;
  flipY: boolean;
};

function drawPreviewPath(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  spacingPercent: number,
  rotationMode: RotationMode,
  rotationJitter: number,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  const previewBrushSize = 34;
  const spacingPx = getBrushSpacingPx(spacingPercent, previewBrushSize);

  const points = [
    { x: 26, y: 118 },
    { x: 48, y: 122 },
    { x: 70, y: 118 },
    { x: 92, y: 106 },
    { x: 116, y: 90 },
    { x: 142, y: 74 },
    { x: 170, y: 64 },
    { x: 200, y: 62 },
    { x: 228, y: 68 },
    { x: 254, y: 82 },
    { x: 278, y: 98 },
    { x: 302, y: 114 },
    { x: 326, y: 122 },
    { x: 350, y: 118 },
    { x: 376, y: 100 },
  ];

  const stamp = (x: number, y: number, rotation: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = 1;
    ctx.drawImage(
      image,
      -previewBrushSize / 2,
      -previewBrushSize / 2,
      previewBrushSize,
      previewBrushSize,
    );
    ctx.restore();
  };

  ctx.imageSmoothingEnabled = true;

  let lastX = points[0].x;
  let lastY = points[0].y;
  let spacingCarry = 0;
  let stampIndex = 0;

  const getRotation = (
    currentX: number,
    currentY: number,
    dx: number,
    dy: number,
  ) => {
    switch (rotationMode) {
      case RotationMode.NONE:
        return 0;
      case RotationMode.FOLLOWSTROKE:
        return Math.atan2(dy, dx);
      case RotationMode.RANDOM:
        return getRandomRotationAngle(
          currentX,
          currentY,
          stampIndex,
          rotationJitter,
        );
      default:
        return 0;
    }
  };

  stamp(lastX, lastY, getRotation(lastX, lastY, 1, 0));
  stampIndex += 1;

  for (let i = 1; i < points.length; i += 1) {
    const startX = lastX;
    const startY = lastY;
    const endX = points[i].x;
    const endY = points[i].y;

    const dx = endX - startX;
    const dy = endY - startY;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (segmentLength <= 0) {
      lastX = endX;
      lastY = endY;
      continue;
    }

    const dirX = dx / segmentLength;
    const dirY = dy / segmentLength;

    let remainingSegment = segmentLength;
    let cursorX = startX;
    let cursorY = startY;

    while (spacingCarry + remainingSegment >= spacingPx) {
      const distanceToNextDab = spacingPx - spacingCarry;

      cursorX += dirX * distanceToNextDab;
      cursorY += dirY * distanceToNextDab;
      remainingSegment -= distanceToNextDab;

      stamp(cursorX, cursorY, getRotation(cursorX, cursorY, dirX, dirY));
      stampIndex += 1;
      spacingCarry = 0;
    }

    spacingCarry += remainingSegment;
    lastX = endX;
    lastY = endY;
  }

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}

function createTransformedImageUrl(
  sourceUrl: string,
  transform: TransformSettings,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const normalizedRotation = ((transform.rotationDeg % 360) + 360) % 360;
      const swapDimensions =
        normalizedRotation === 90 || normalizedRotation === 270;

      const canvas = document.createElement("canvas");
      canvas.width = swapDimensions ? img.height : img.width;
      canvas.height = swapDimensions ? img.width : img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create image transform context"));
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((normalizedRotation * Math.PI) / 180);
      ctx.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1);

      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      reject(new Error("Could not load image for transform"));
    };

    img.src = sourceUrl;
  });
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/png" });
}

function BrushLivePreview({
  imageSrc,
  spacing,
  rotationMode,
  rotationJitter,
}: {
  imageSrc: string;
  spacing: number;
  rotationMode: RotationMode;
  rotationJitter: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new window.Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCheckerboard(ctx, canvas.width, canvas.height);
      drawPreviewPath(
        ctx,
        image,
        Number(spacing),
        rotationMode,
        Number(rotationJitter),
      );
    };

    image.onerror = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCheckerboard(ctx, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Preview unavailable", canvas.width / 2, canvas.height / 2);
    };

    image.src = imageSrc;
  }, [imageSrc, spacing, rotationMode, rotationJitter]);

  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>
        Live Preview
      </Text>
      <Box
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "#262626",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          width={402}
          height={154}
          style={{
            display: "block",
            width: "100%",
            height: 154,
          }}
        />
      </Box>
      <Text size="xs" c="dimmed">
        Updates as you change the brush image, spacing, and rotation settings.
      </Text>
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
  const [transform, setTransform] = useState<TransformSettings>({
    rotationDeg: 0,
    flipX: false,
    flipY: false,
  });

  const sourcePreviewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }

    return baseurl + (brush?.imgurl ?? "/user/brush/softShape.png");
  }, [selectedFile, brush?.imgurl]);

  useEffect(() => {
    if (!selectedFile) return;

    const objectUrl = sourcePreviewUrl;
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile, sourcePreviewUrl]);

  const [transformedPreviewUrl, setTransformedPreviewUrl] =
    useState<string>(sourcePreviewUrl);

  useEffect(() => {
    let cancelled = false;

    const buildPreview = async () => {
      try {
        const result = await createTransformedImageUrl(
          sourcePreviewUrl,
          transform,
        );
        if (!cancelled) {
          setTransformedPreviewUrl(result);
        }
      } catch {
        if (!cancelled) {
          setTransformedPreviewUrl(sourcePreviewUrl);
        }
      }
    };

    void buildPreview();

    return () => {
      cancelled = true;
    };
  }, [sourcePreviewUrl, transform]);

  const form = useForm({
    initialValues: {
      name: brush?.name ?? "",
      spacing: brush?.spacing ?? 12,
      rotation_mode: brush?.rotation_mode ?? RotationMode.NONE,
      rotation_jitter: brush?.rotation_jitter ?? 100,
    },
    validate: {
      name: (value) => {
        if (value.length === 0) {
          return "name cannot be empty";
        }
        return null;
      },
      spacing: (value) => {
        if (value < 1) return "spacing must be at least 1%";
        if (value > 100) return "spacing cannot be greater than 100%";
        return null;
      },
      rotation_jitter: (value) => {
        if (value < 0) return "rotation jitter cannot be less than 0%";
        if (value > 100) return "rotation jitter cannot be greater than 100%";
        return null;
      },
    },
  });

  const handleRotateLeft = () => {
    setTransform((prev) => ({
      ...prev,
      rotationDeg: prev.rotationDeg - 90,
    }));
  };

  const handleRotateRight = () => {
    setTransform((prev) => ({
      ...prev,
      rotationDeg: prev.rotationDeg + 90,
    }));
  };

  const handleFlipX = () => {
    setTransform((prev) => ({
      ...prev,
      flipX: !prev.flipX,
    }));
  };

  const handleFlipY = () => {
    setTransform((prev) => ({
      ...prev,
      flipY: !prev.flipY,
    }));
  };

  const resetTransform = () => {
    setTransform({
      rotationDeg: 0,
      flipX: false,
      flipY: false,
    });
  };

  const handleSubmit = async (values: typeof form.values) => {
    setSaving(true);

    try {
      let response;

      if (isEdit && brush) {
        const dto: BrushUpdateDto = {
          name: values.name,
          spacing: values.spacing,
          rotation_mode: values.rotation_mode,
          rotation_jitter: values.rotation_jitter,
        };

        response = await api.patch<BrushGetDto>(`/brushes/${brush.id}`, dto);
      } else {
        const dto: BrushCreateDto = {
          name: values.name,
          spacing: values.spacing,
          rotation_mode: values.rotation_mode,
          rotation_jitter: values.rotation_jitter,
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

      if (savedBrush) {
        let fileToUpload: File | FileWithPath | null = null;

        if (selectedFile) {
          const transformedFile = await dataUrlToFile(
            transformedPreviewUrl,
            `${selectedFile.name.replace(/\.[^.]+$/, "") || "brush"}-transformed.png`,
          );
          fileToUpload = transformedFile;
        }

        if (fileToUpload) {
          const imageResponse = await api.patchf<BrushGetDto>(
            `/brushes/${savedBrush.id}/imgurl`,
            fileToUpload,
          );

          if (!imageResponse.data.has_errors && imageResponse.data.data) {
            savedBrush = imageResponse.data.data;
          }
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

  const showRotationJitter = form.values.rotation_mode === RotationMode.RANDOM;

  return (
    <form
      onSubmit={form.onSubmit(handleSubmit)}
      style={{
        maxHeight: "75vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 16,
        }}
      >
        <Paper
          withBorder
          radius={0}
          p="xs"
          bg="#303030"
          style={{ width: 170, flexShrink: 0 }}
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
                src={transformedPreviewUrl}
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

                    const baseName = file.name.replace(/\.[^/.]+$/, "");
                    form.setFieldValue("name", baseName);
                    setTransform({
                      rotationDeg: 0,
                      flipX: false,
                      flipY: false,
                    });
                  }
                }}
              />
            </Button>

            <Group gap={4} wrap="nowrap">
              <ActionIcon
                radius={0}
                variant="outline"
                onClick={handleRotateLeft}
              >
                <IconRotate2 size={16} />
              </ActionIcon>
              <ActionIcon
                radius={0}
                variant="outline"
                onClick={handleRotateRight}
              >
                <IconRotateClockwise2 size={16} />
              </ActionIcon>
              <ActionIcon radius={0} variant="outline" onClick={handleFlipX}>
                <IconFlipHorizontal size={16} />
              </ActionIcon>
              <ActionIcon radius={0} variant="outline" onClick={handleFlipY}>
                <IconFlipVertical size={16} />
              </ActionIcon>
            </Group>

            <Button
              variant="subtle"
              radius={0}
              size="xs"
              onClick={resetTransform}
            >
              Reset Orientation
            </Button>

            {selectedFile ? (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {selectedFile.name}
              </Text>
            ) : (
              <Text size="xs" c="dimmed">
                Rotation/flip affects uploaded replacement.
              </Text>
            )}
          </Stack>
        </Paper>

        <Box
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box style={{ flexShrink: 0 }}>
            <BrushLivePreview
              imageSrc={transformedPreviewUrl}
              spacing={Number(form.values.spacing)}
              rotationMode={form.values.rotation_mode}
              rotationJitter={Number(form.values.rotation_jitter)}
            />
          </Box>

          <Box
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              marginTop: 16,
            }}
          >
            <ScrollArea
              offsetScrollbars
              scrollbarSize={10}
              h="100%"
              viewportProps={{
                style: {
                  height: "100%",
                },
              }}
            >
              <Box pr="xs">
                <Stack gap="md">
                  <SettingBlock label="Name">
                    <TextInput
                      radius={0}
                      key={form.key("name")}
                      {...form.getInputProps("name")}
                    />
                  </SettingBlock>

                  <SettingBlock label="Spacing (% of diameter)">
                    <Group wrap="nowrap" align="center">
                      <Slider
                        style={{ flex: 1 }}
                        min={1}
                        max={100}
                        step={1}
                        value={Number(form.values.spacing)}
                        onChange={(value) =>
                          form.setFieldValue("spacing", value)
                        }
                        marks={[
                          { value: 1, label: "1%" },
                          { value: 10, label: "10%" },
                          { value: 25, label: "25%" },
                          { value: 50, label: "50%" },
                          { value: 100, label: "100%" },
                        ]}
                      />
                      <NumberInput
                        radius={0}
                        w={90}
                        min={1}
                        max={100}
                        step={1}
                        suffix="%"
                        key={form.key("spacing")}
                        {...form.getInputProps("spacing")}
                      />
                    </Group>

                    <Text size="xs" c="dimmed">
                      Lower spacing gives smoother painting. Higher spacing
                      makes the brush look more stamped.
                    </Text>
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

                  {showRotationJitter ? (
                    <SettingBlock label="Random Rotation Strength">
                      <Group wrap="nowrap" align="center">
                        <Slider
                          style={{ flex: 1 }}
                          min={0}
                          max={100}
                          step={1}
                          value={Number(form.values.rotation_jitter)}
                          onChange={(value) =>
                            form.setFieldValue("rotation_jitter", value)
                          }
                          marks={[
                            { value: 0, label: "0%" },
                            { value: 25, label: "25%" },
                            { value: 50, label: "50%" },
                            { value: 100, label: "100%" },
                          ]}
                        />
                        <NumberInput
                          radius={0}
                          w={90}
                          min={0}
                          max={100}
                          step={1}
                          suffix="%"
                          key={form.key("rotation_jitter")}
                          {...form.getInputProps("rotation_jitter")}
                        />
                      </Group>

                      <Text size="xs" c="dimmed">
                        Controls how much rotation variation is applied when
                        using Random mode.
                      </Text>
                    </SettingBlock>
                  ) : null}
                </Stack>
              </Box>
            </ScrollArea>
          </Box>
        </Box>
      </Box>

      <Group justify="space-between" mt="md">
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
    </form>
  );
};
