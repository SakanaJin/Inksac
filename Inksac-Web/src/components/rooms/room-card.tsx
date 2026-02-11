import { Card, Text, Button, Stack, Badge, Group } from "@mantine/core";
import type { RoomGetDto } from "../../constants/types";

export function RoomCard({ room }: { room: RoomGetDto }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack>
        <Text fw={600} fz="lg">
          {room.name}
        </Text>
        <Text size="sm" c="dimmed">
          Expires: {new Date(room.expiration).toLocaleString()}
        </Text>

        {/* Owner label */}
        <Group gap="xs" align="center">
          <Text size="sm" c="gray.5">
            Owner:
          </Text>
          <Badge variant="light" color="teal" size="sm">
            {room.owner.username}
          </Badge>
        </Group>

        <Button fullWidth mt="sm">
          Join Room
        </Button>
      </Stack>
    </Card>
  );
}
