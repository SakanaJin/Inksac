import { Card, Text, Button, Stack, Badge, Group } from "@mantine/core";

interface Room {
  id: string;
  name: string;
  owner: string;
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack>
        <Text fw={600} fz="lg">
          {room.name}
        </Text>
        {/* Owner label */}
        <Group gap="xs" align="center">
          <Text size="sm" c="gray.5">
            Owner:
          </Text>
          <Badge variant="light" color="teal" size="sm">
            {room.owner}
          </Badge>
        </Group>

        <Button fullWidth mt="sm">
          Join Room
        </Button>
      </Stack>
    </Card>
  );
}
