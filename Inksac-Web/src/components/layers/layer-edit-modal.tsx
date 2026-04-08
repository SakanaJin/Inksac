import { Button, Flex, Stack, TextInput } from "@mantine/core";
import type { ContextModalProps } from "@mantine/modals";
import { useForm } from "@mantine/form";

export interface LayerEditModalProps {
  initialName: string;
  onSubmit: (name: string) => Promise<void> | void;
}

export const LayerEditModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<LayerEditModalProps>) => {
  const form = useForm({
    initialValues: {
      name: innerProps.initialName,
    },
    validate: {
      name: (value) =>
        value.trim().length === 0 ? "Layer name cannot be empty" : null,
    },
  });

  const handleSubmit = async (values: { name: string }) => {
    await innerProps.onSubmit(values.name.trim());
    context.closeModal(id);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <TextInput
          autoFocus
          label="Layer Name"
          placeholder="Enter layer name"
          {...form.getInputProps("name")}
        />

        <Flex justify="space-between" pt="sm">
          <Button variant="outline" onClick={() => context.closeModal(id)}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </Flex>
      </Stack>
    </form>
  );
};
