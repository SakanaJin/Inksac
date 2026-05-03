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
    <Group h="100%" px="md" wrap="nowrap" style={{ minWidth: 0 }}>
      <Burger opened={opened} onClick={toggle} style={{ flexShrink: 0 }} />

      <Group
        gap="xs"
        wrap="nowrap"
        align="center"
        style={{
          minWidth: 0,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <img
          src={logo}
          alt="logo"
          style={{ width: 90, height: 90, flexShrink: 0 }}
        />

        <Title
          order={3}
          size={40}
          title={title}
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </Title>
      </Group>

      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        {actions}
      </Group>
    </Group>
  );
};
