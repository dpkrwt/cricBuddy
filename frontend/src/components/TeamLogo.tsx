import { Box } from "@chakra-ui/react";
import type { SyntheticEvent } from "react";

interface TeamLogoProps {
  src?: string;
  alt?: string;
  size?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: string;
}

function TeamLogo({
  src,
  alt,
  size = "40px",
  bgColor,
  borderColor,
  borderWidth,
}: TeamLogoProps) {
  return (
    <Box
      w={size}
      h={size}
      borderRadius="full"
      bg={bgColor || "transparent"}
      border={borderWidth ? `${borderWidth} solid` : undefined}
      borderColor={borderColor}
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      flexShrink={0}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          style={{
            width: size,
            height: size,
            objectFit: "cover",
            borderRadius: "50%",
          }}
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </Box>
  );
}

export default TeamLogo;
