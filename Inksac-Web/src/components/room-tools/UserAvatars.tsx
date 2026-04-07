import { Avatar, Tooltip } from "@mantine/core";
import React from "react";
import { EnvVars } from "../../config/env-vars";
import type { UserGetDto } from "../../constants/types";

const baseurl = EnvVars.mediaBaseUrl;

interface UserAvatarsParams {
  users: UserGetDto[];
}

export const UserAvatars = React.memo(({ users }: UserAvatarsParams) => {
  return (
    <Tooltip.Group>
      <Avatar.Group>
        {users.slice(0, 5).map((user) => (
          <Tooltip
            key={user.id}
            withArrow
            label={user.username}
            openDelay={100}
            closeDelay={100}
            withinPortal={false}
          >
            <Avatar src={baseurl + user.pfp_path} />
          </Tooltip>
        ))}

        {users.length > 5 && (
          <Tooltip
            withArrow
            openDelay={100}
            closeDelay={100}
            withinPortal={false}
            label={
              <>
                {users.slice(5).map((user) => (
                  <div key={user.id}>{user.username}</div>
                ))}
              </>
            }
          >
            <Avatar>+{users.length - 5}</Avatar>
          </Tooltip>
        )}
      </Avatar.Group>
    </Tooltip.Group>
  );
});
