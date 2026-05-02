import type { ContextModalProps } from "@mantine/modals";
import { useEffect, useState } from "react";
import type { UserShallowDto } from "../../constants/types";
import api from "../../config/axios";
import {
  ActionIcon,
  Avatar,
  Card,
  Group,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
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
  }, [debounced]);

  return (
    <Stack>
      <Select
        value={value}
        data={options}
        onChange={(value) => {
          if (!value) return;
          allowUser(+value);
          setSearch("");
          setValue(null);
        }}
        searchable
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          if (!val.trim()) setOptions([]);
        }}
        placeholder="Search users..."
        rightSection={loading ? <Loader size="xs" /> : null}
        nothingFoundMessage={
          debounced ? "No users found" : "Start typing to search"
        }
        clearable
      />
      <ScrollArea h="20rem">
        {allowedUsers.map((auser) => {
          if (auser.id == innerProps.userid) return;
          return (
            <Card m="xs">
              <Group justify="space-between">
                <Group>
                  <Avatar src={mediabaseurl + auser.pfp_path} />
                  <Title>{auser.username}</Title>
                </Group>
                <Tooltip label="remove user">
                  <ActionIcon color="red" onClick={() => removeUser(auser.id)}>
                    <IconX />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Card>
          );
        })}
      </ScrollArea>
    </Stack>
  );
};
