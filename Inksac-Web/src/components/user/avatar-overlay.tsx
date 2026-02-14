import { Avatar, Box, Overlay } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import type React from "react";

interface AvatarOverlayProps {
  src: string;
  overlay: boolean;
  children?: React.ReactNode;
  size?: string;
  onClick: () => void;
}

export const AvatarOverlay: React.FC<AvatarOverlayProps> = ({
  src,
  overlay,
  children,
  size,
  onClick,
}) => {
  const { hovered, ref } = useHover();

  return (
    <Box
      pos="relative"
      ref={ref}
      w={size}
      h={size}
      style={{ cursor: hovered && overlay ? "pointer" : "default" }}
      onClick={() => onClick()}
    >
      <Avatar size={size} src={src} />
      {overlay && hovered && (
        <Overlay
          center={true}
          style={{ borderRadius: "9999px" }}
          color="var(--mantine-color-body)"
          opacity={0.85}
        >
          {children ? children : null}
        </Overlay>
      )}
    </Box>
  );
};
