import type { ContextModalProps } from "@mantine/modals";
import { useEffect, useState } from "react";
import type { UserShallowDto } from "../../constants/types";
import api from "../../config/axios";
import {
  ActionIcon,
  Avatar,
  Box,
  Card,
  Group,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch, IconUserPlus, IconX } from "@tabler/icons-react";
import { EnvVars } from "../../config/env-vars";

export interface UserAddModalProps {
  roomid: number;
  userid: number;
}

interface UserOption {
  value: string;
  label: string;
}

const mediabaseurl = EnvVars.mediaBaseUrl;

export const UserAddModal = ({
  context,
  id,
  innerProps,
}: ContextModalProps<UserAddModalProps>) => {
  const [allowedUsers, setAllowedUsers] = useState<UserShallowDto[]>([]);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(null);

  const [debounced] = useDebouncedValue(search, 300);

  const allowUser = async (userid: number) => {
    const response = await api.post<UserShallowDto>(
      `/rooms/${innerProps.roomid}/user/${userid}`,
    );

    if (response.data.errors) {
      response.data.errors.forEach((error) => console.error(error.message));
    }

    if (response.data.data) {
      setAllowedUsers((allowedUsers) => [response.data.data, ...allowedUsers]);
    }
  };

  const removeUser = async (userid: number) => {
    const response = await api.delete<UserShallowDto>(
      `/rooms/${innerProps.roomid}/user/${userid}`,
    );

    if (response.data.errors) {
      response.data.errors.forEach((error) => console.error(error.message));
    }

    if (response.data.data) {
      setAllowedUsers((allowedUsers) =>
        allowedUsers.filter((auser) => auser.id != userid),
      );
    }
  };

  const fetchAllowedUsers = async () => {
    const response = await api.get<UserShallowDto[]>(
      `/rooms/${innerProps.roomid}/allowed`,
    );

    if (response.data.has_errors) {
      response.data.errors.forEach((error) => console.error(error));
      context.closeModal(id);
    }

    if (response.data.data) {
      setAllowedUsers(response.data.data);
    }
  };

  useEffect(() => {
    fetchAllowedUsers();
  }, []);

  useEffect(() => {
    if (!debounced.trim()) return;
    setLoading(true);
    api
      .get<UserShallowDto[]>(
        `/users/search?username=${debounced}&roomid=${innerProps.roomid}`,
      )
      .then((response) =>
        setOptions(
          response.data.data.map((u) => ({
            value: String(u.id),
            label: u.username,
          })),
        ),
      )
      .finally(() => setLoading(false));
  }, [debounced, innerProps.roomid]);

  const visibleAllowedUsers = allowedUsers.filter(
    (auser) => auser.id !== innerProps.userid,
  );

  return (
    <Stack gap="md">
      <Box>
        <Group gap="xs" mb={4}>
          <IconUserPlus size={18} />
          <Text fw={700}>Manage room access</Text>
        </Group>

        <Text size="sm" c="dimmed">
          Search for users to add them to this private room.
        </Text>
      </Box>

      <Select
        value={value}
        data={options}
        onChange={(value) => {
          if (!value) return;
          allowUser(+value);
          setSearch("");
          setValue(null);
          setOptions([]);
        }}
        searchable
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          if (!val.trim()) setOptions([]);
        }}
        placeholder="Search users..."
        leftSection={<IconSearch size={16} />}
        rightSection={loading ? <Loader size="xs" /> : null}
        nothingFoundMessage={
          debounced ? "No users found" : "Start typing to search"
        }
        clearable
        radius="md"
        size="md"
      />

      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={700}>
            Allowed users
          </Text>

          <Text size="xs" c="dimmed">
            {visibleAllowedUsers.length} user
            {visibleAllowedUsers.length === 1 ? "" : "s"}
          </Text>
        </Group>

        <ScrollArea h="20rem" offsetScrollbars scrollbarSize={8}>
          {visibleAllowedUsers.length === 0 ? (
            <Card
              withBorder
              radius="md"
              p="lg"
              style={{
                background: "rgba(255,255,255,0.025)",
              }}
            >
              <Stack gap={4} align="center">
                <Text fw={600}>No users added yet</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Search above to add users who can access this room.
                </Text>
              </Stack>
            </Card>
          ) : (
            <Stack gap="xs">
              {visibleAllowedUsers.map((auser) => (
                <Card
                  key={auser.id}
                  withBorder
                  radius="md"
                  p="sm"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Avatar
                        src={mediabaseurl + auser.pfp_path}
                        radius="xl"
                        size="md"
                        style={{ flexShrink: 0 }}
                      />

                      <Box style={{ minWidth: 0 }}>
                        <Text
                          fw={600}
                          truncate
                          title={auser.username}
                          style={{ maxWidth: 220 }}
                        >
                          {auser.username}
                        </Text>

                        <Text size="xs" c="dimmed">
                          Can access this room
                        </Text>
                      </Box>
                    </Group>

                    <Tooltip label="Remove user">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        radius="xl"
                        onClick={() => removeUser(auser.id)}
                      >
                        <IconX size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Box>
    </Stack>
  );
};
