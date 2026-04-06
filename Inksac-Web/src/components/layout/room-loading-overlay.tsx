import { Box, Text } from "@mantine/core";

export function RoomLoadingOverlay() {
  const letters = "Inksac".split("");

  return (
    <Box
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        background: "#323232",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Box
          style={{
            display: "flex",
            gap: "2px",
          }}
        >
          {letters.map((letter, i) => (
            <Text
              key={i}
              style={{
                fontSize: "72px",
                fontWeight: 700,
                fontFamily: `"Brush Script MT", "Segoe Script", cursive`,
                letterSpacing: "1px",
                color: "#ffffff",
                opacity: 0,
                transform: "translateY(12px)",
                animation: "inksac-letter-loop 3s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            >
              {letter}
            </Text>
          ))}
        </Box>

        <Text
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.5px",
            opacity: 0,
            animation: "inksac-subtext 0.8s ease forwards",
            animationDelay: "1.2s",
            animationFillMode: "forwards",
          }}
        >
          Loading room...
        </Text>
      </Box>

      <style>
        {`
          @keyframes inksac-letter-loop {
            0% {
              opacity: 0;
              transform: translateY(12px) scale(0.95);
            }
            18% {
              opacity: 0;
              transform: translateY(12px) scale(0.95);
            }
            35% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            72% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            88% {
              opacity: 0;
              transform: translateY(-6px) scale(0.98);
            }
            100% {
              opacity: 0;
              transform: translateY(-6px) scale(0.98);
            }
          }

          @keyframes inksac-subtext {
            0% {
              opacity: 0;
              transform: translateY(6px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </Box>
  );
}
