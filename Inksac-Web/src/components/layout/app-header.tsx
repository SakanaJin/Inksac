import { Group, Burger, Title } from "@mantine/core";
import type { ReactNode } from "react";
import logo from "../../assets/logo.svg";

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

      <Group gap="xs" wrap="nowrap" align="center">
        <img src={logo} alt="logo" style={{ width: 90, height: 90 }} />
        <Title order={3} size={40}>
          {title}
        </Title>
      </Group>

      <Group gap="xs" wrap="nowrap" style={{ marginLeft: "auto" }}>
        {actions}
      </Group>
    </Group>
  );
};
