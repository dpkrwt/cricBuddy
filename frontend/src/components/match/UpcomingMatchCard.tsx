import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import TeamLogo from "../TeamLogo";
import type { Match } from "../../types";

function UpcomingMatchCard({ match }: { match: Match }) {
  const dateObj = match.dateTimeGMT
    ? new Date(match.dateTimeGMT)
    : new Date(match.date + "T" + (match.time || "00:00") + ":00");
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Box
      bg="bg.card"
      borderRadius="xl"
      p={5}
      border="1px solid"
      borderColor="border.default"
      transition="all 0.2s"
    >
      <HStack justify="space-between" mb={3}>
        <Text fontSize="xs" color="text.muted">
          {match.matchNo ? `Match ${match.matchNo}` : match.name || ""}
        </Text>
        <HStack gap={2}>
          <Text fontSize="xs" color="accent.solid" fontWeight="600">
            {dateStr}
          </Text>
          <Text fontSize="xs" color="text.muted">
            {timeStr}
          </Text>
        </HStack>
      </HStack>

      <Flex justify="space-between" align="center">
        <HStack gap={3} flex={1}>
          <TeamLogo
            src={match.team1Info?.logo}
            alt={match.team1Info?.shortName}
            size="40px"
            bgColor={`${match.team1Info?.color}22`}
          />
          <Text fontWeight="700" fontSize="sm" color="text.primary">
            {match.team1Info?.shortName}
          </Text>
        </HStack>
        <Text fontSize="sm" fontWeight="700" color="text.muted" px={4}>
          vs
        </Text>
        <HStack gap={3} flex={1} justify="flex-end">
          <Text fontWeight="700" fontSize="sm" color="text.primary">
            {match.team2Info?.shortName}
          </Text>
          <TeamLogo
            src={match.team2Info?.logo}
            alt={match.team2Info?.shortName}
            size="40px"
            bgColor={`${match.team2Info?.color}22`}
          />
        </HStack>
      </Flex>

      <Text fontSize="xs" color="text.muted" mt={3} textAlign="center">
        {match.venue}
      </Text>
    </Box>
  );
}

export default UpcomingMatchCard;
