import { Box, Flex, HStack, VStack, Text, Badge } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import TeamLogo from "../TeamLogo";
import type { Match } from "../../types";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

function LiveMatchCard({ match }: { match: Match }) {
  return (
    <Box
      bg={{
        base: "linear-gradient(135deg, #fef2f2 0%, #eff6ff 50%, #fef2f2 100%)",
        _dark: "linear-gradient(135deg, #1a0505 0%, #162231 50%, #1a0505 100%)",
      }}
      borderRadius="xl"
      p={6}
      border="1px solid"
      borderColor={{ base: "red.300", _dark: "red.800" }}
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="3px"
        bg="linear-gradient(90deg, #ef4444, #f97316, #ef4444)"
      />

      <HStack justify="space-between" mb={4}>
        <HStack gap={2}>
          <Badge
            colorPalette="red"
            variant="solid"
            px={3}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="700"
            animation={`${pulse} 1.5s ease-in-out infinite`}
          >
            ● LIVE
          </Badge>
          <Text fontSize="xs" color="text.muted">
            {match.matchNo ? `Match ${match.matchNo}` : match.name || ""}
          </Text>
        </HStack>
        <Text fontSize="xs" color="text.muted">
          {match.venue}
        </Text>
      </HStack>

      <Flex justify="space-between" align="center" gap={4}>
        <VStack flex={1} gap={2} align="center">
          <TeamLogo
            src={match.team1Info?.logo}
            alt={match.team1Info?.shortName}
            size="60px"
            bgColor={`${match.team1Info?.color}22`}
          />
          <Text
            fontWeight="800"
            fontSize="lg"
            color="text.primary"
            textAlign="center"
          >
            {match.team1Info?.shortName}
          </Text>
          {match.team1Score && (
            <Text
              fontSize="xl"
              fontWeight="900"
              color="text.primary"
              textAlign="center"
            >
              {match.team1Score}
            </Text>
          )}
        </VStack>

        <VStack gap={1} align="center">
          <Text fontSize="2xl" fontWeight="900" color="text.muted">
            VS
          </Text>
          {match.liveDetail && (
            <VStack gap={0} align="center">
              <Text fontSize="xs" color="accent.solid">
                CRR: {match.liveDetail.crr}
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Over {match.liveDetail.currentOver}
              </Text>
            </VStack>
          )}
        </VStack>

        <VStack flex={1} gap={2} align="center">
          <TeamLogo
            src={match.team2Info?.logo}
            alt={match.team2Info?.shortName}
            size="60px"
            bgColor={`${match.team2Info?.color}22`}
          />
          <Text
            fontWeight="800"
            fontSize="lg"
            color="text.primary"
            textAlign="center"
          >
            {match.team2Info?.shortName}
          </Text>
          {match.team2Score && (
            <Text
              fontSize="xl"
              fontWeight="900"
              color="text.primary"
              textAlign="center"
            >
              {match.team2Score}
            </Text>
          )}
        </VStack>
      </Flex>

      {match.liveDetail?.lastWicket && (
        <Text fontSize="xs" color="text.muted" mt={4} textAlign="center">
          Last wicket: {match.liveDetail.lastWicket}
        </Text>
      )}
    </Box>
  );
}

export default LiveMatchCard;
