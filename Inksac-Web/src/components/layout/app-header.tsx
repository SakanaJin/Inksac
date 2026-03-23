import { Group, Burger, Title } from "@mantine/core";

type AppHeaderProps = {
  opened: boolean;
  toggle: () => void;
  title?: string;
};

export const AppHeader = ({
  opened,
  toggle,
  title = "Inksac",
}: AppHeaderProps) => {
  return (
    <Group h="100%" px="md">
      <Burger opened={opened} onClick={toggle} />
      <Title order={3}>{title}</Title>
    </Group>
  );
};
