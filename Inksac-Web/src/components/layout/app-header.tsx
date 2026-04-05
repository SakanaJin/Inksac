import { Group, Burger, Title } from "@mantine/core";
import type { ReactNode } from "react";

type AppHeaderProps = {
  opened: boolean;
  toggle: () => void;
  title?: string;
  actions?: ReactNode;
};

export const AppHeader = ({
  opened,
  toggle,
  title = "Inksac",
  actions,
}: AppHeaderProps) => {
  return (
    <Group h="100%" px="md" wrap="nowrap">
      <Burger opened={opened} onClick={toggle} />
      <Title order={3}>{title}</Title>

      <Group gap="xs" wrap="nowrap" style={{ marginLeft: "auto" }}>
        {actions}
      </Group>
    </Group>
  );
};
