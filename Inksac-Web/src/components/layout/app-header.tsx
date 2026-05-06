import { Group, Burger, Title } from "@mantine/core";
import type { ReactNode } from "react";
import logo from "../../assets/logo.svg";

type AppHeaderProps = {
  opened: boolean;
  toggle: () => void;
  title?: string;
  actions?: ReactNode;
  variant?: "default" | "home";
};

export const AppHeader = ({
  opened,
  toggle,
  title = "Inksac",
  actions,
  variant = "default",
}: AppHeaderProps) => {
  const isHome = variant === "home";

  return (
    <Group
      h="100%"
      px="md"
      wrap="nowrap"
      style={{
        minWidth: 0,
        background: isHome ? "rgba(20, 24, 31, 0.98)" : undefined,
        borderBottom: isHome ? "1px solid rgba(255,255,255,0.08)" : undefined,
      }}
    >
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
          style={{
            width: 54,
            height: 54,
            flexShrink: 0,
          }}
        />

        <Title
          order={3}
          title={title}
          style={{
            fontSize: 28,
            fontWeight: 700,
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
