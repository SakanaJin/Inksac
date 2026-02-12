import { Group, Burger, Title } from "@mantine/core";

type AppHeaderProps = {
  opened: boolean;
  toggle: () => void;
};

export const AppHeader = ({ opened, toggle }: AppHeaderProps) => {
  return (
    <Group h="100%" px="md">
      <Burger opened={opened} onClick={toggle} />
      <Title order={3}>Inksac</Title>
    </Group>
  );
};
