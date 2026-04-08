import { useEffect, useState } from "react";
import {
  Box,
  Heading,
  Flex,
  Text,
  HStack,
  VStack,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { getLiveMatches, getUpcomingMatches } from "../api";
import MembersSection from "../components/MembersSection";
import LiveMatchCard from "../components/match/LiveMatchCard";
import UpcomingMatchCard from "../components/match/UpcomingMatchCard";
import type { Match } from "../types";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

function Dashboard() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLiveMatches(), getUpcomingMatches()])
      .then(([liveRes, upcomingRes]) => {
        setLiveMatches(liveRes.data);
        setUpcomingMatches(upcomingRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Center h="60vh">
        <Spinner size="xl" color="accent.solid" borderWidth="4px" />
      </Center>
    );
  }

  return (
    <Box>
      {(liveMatches.length > 0 || upcomingMatches.length > 0) && (
        <Flex
          direction={{ base: "column", lg: "row" }}
          gap={6}
          mb={8}
          align="stretch"
        >
          {liveMatches.length > 0 && (
            <Box flex={1}>
              <Heading size="lg" mb={4}>
                <HStack>
                  <Text>Live Now</Text>
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="red.500"
                    animation={`${pulse} 1.5s ease-in-out infinite`}
                  />
                </HStack>
              </Heading>
              <VStack gap={4} align="stretch">
                {liveMatches.map((m) => (
                  <LiveMatchCard key={m.id || m.matchNo} match={m} />
                ))}
              </VStack>
            </Box>
          )}

          {upcomingMatches.length > 0 && (
            <Box flex={!liveMatches.length ? 0.5 : 1}>
              <Heading size="lg" mb={4}>
                Upcoming Matches
              </Heading>
              {upcomingMatches.slice(0, 1).map((m) => (
                <UpcomingMatchCard key={m.id || m.matchNo} match={m} />
              ))}
            </Box>
          )}
        </Flex>
      )}

      <MembersSection />
    </Box>
  );
}

export default Dashboard;
