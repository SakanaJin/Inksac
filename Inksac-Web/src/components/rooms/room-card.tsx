import { Card, Text, Button, Stack, Badge } from "@mantine/core";

interface Room {
  id: string;
  name: string;
  users: number;
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack>
        <Text fw={600}>{room.name}</Text>
        <Badge color={room.users > 0 ? "green" : "gray"}>
          {room.users} active
        </Badge>

        <Button fullWidth mt="sm">
          Join Room
        </Button>
      </Stack>
    </Card>
  );
}
