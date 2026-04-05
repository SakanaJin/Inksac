import { Button, Checkbox, Flex, Select, Stack } from "@mantine/core";
import type { ContextModalProps } from "@mantine/modals";
import { useState } from "react";

export interface ExportModalSubmitValues {
  format: "png" | "jpg";
  transparentBackground: boolean;
  scale: 1 | 2;
}

export interface ExportModalProps {
  onSubmit: (values: ExportModalSubmitValues) => Promise<void> | void;
}

export const ExportModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<ExportModalProps>) => {
  const [format, setFormat] = useState<"png" | "jpg">("png");
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [scale, setScale] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      await innerProps.onSubmit({
        format,
        transparentBackground: format === "png" ? transparentBackground : false,
        scale,
      });
      context.closeModal(id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="sm">
      <Select
        label="File type"
        data={[
          { value: "png", label: "PNG" },
          { value: "jpg", label: "JPG" },
        ]}
        value={format}
        onChange={(value) => {
          if (value === "png" || value === "jpg") {
            setFormat(value);
          }
        }}
        allowDeselect={false}
      />

      <Select
        label="Size"
        data={[
          { value: "1", label: "1x" },
          { value: "2", label: "2x" },
        ]}
        value={scale.toString()}
        onChange={(value) => {
          if (value === "1" || value === "2") {
            setScale(Number(value) as 1 | 2);
          }
        }}
        allowDeselect={false}
      />

      {format === "png" ? (
        <Checkbox
          label="Transparent background"
          checked={transparentBackground}
          onChange={(event) =>
            setTransparentBackground(event.currentTarget.checked)
          }
        />
      ) : null}

      <Flex justify="space-between" pt="sm">
        <Button variant="outline" onClick={() => context.closeModal(id)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          Download
        </Button>
      </Flex>
    </Stack>
  );
};
