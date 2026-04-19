import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  Spinner,
  Center,
  SimpleGrid,
  Breadcrumb,
  Flex,
  Image,
} from "@chakra-ui/react";
import { MdArrowBack } from "react-icons/md";
import { getTeam } from "../api";
import TeamLogo from "../components/TeamLogo";
import type { Team } from "../types";

function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    getTeam(teamId)
      .then((res) => setTeam(res.data))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <Center h="60vh">
        <Spinner size="xl" color="accent.solid" borderWidth="4px" />
      </Center>
    );
  }

  if (!team) {
    return <Text color="text.muted">Team not found.</Text>;
  }

  const roleColors: Record<string, string> = {
    Batter: "blue",
    Bowler: "red",
    "All-rounder": "green",
    "Wicket-keeper": "orange",
  };

  return (
    <Box>
      <Breadcrumb.Root mb={6} fontSize="sm">
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link asChild>
              <Link
                to="/teams"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "inherit",
                }}
              >
                <MdArrowBack /> Teams
              </Link>
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink color="text.primary">
              {team.shortName}
            </Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <Box
        bg="bg.card"
        borderRadius="xl"
        p={8}
        mb={6}
        border="1px solid"
        borderColor="border.default"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="4px"
          bg={team.color}
        />
        <Flex direction={{ base: "column", md: "row" }} align="center" gap={6}>
          <TeamLogo
            src={team.logo}
            alt={team.shortName}
            size="100px"
            bgColor={`${team.color}22`}
            borderWidth="3px"
            borderColor={team.color}
          />
          <VStack align={{ base: "center", md: "start" }} gap={1}>
            <Heading size="xl" color="text.primary">
              {team.name}
            </Heading>
            <Text color="text.secondary" fontSize="sm">
              Captain: {team.captain}
            </Text>
            <Text color="text.muted" fontSize="sm">
              {team.homeGround}
            </Text>
          </VStack>
        </Flex>
      </Box>

      <Heading size="md" mb={4} color="text.primary">
        Squad
      </Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
        {team.players?.map((player, idx) => (
          <Box
            key={player.id || idx}
            bg="bg.card"
            borderRadius="xl"
            p={5}
            border="1px solid"
            borderColor="border.default"
            _hover={{
              borderColor: `${team.color}88`,
              transform: "translateY(-2px)",
            }}
            transition="all 0.2s"
          >
            <HStack gap={3} align="start">
              {player.playerImg && (
                <Image
                  src={player.playerImg}
                  alt={player.name}
                  boxSize="48px"
                  borderRadius="full"
                  objectFit="cover"
                  flexShrink={0}
                  bg={`${team.color}22`}
                />
              )}
              <VStack gap={2} align="start" flex={1}>
                <Text fontWeight="700" fontSize="md" color="text.primary">
                  {player.name}
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Badge
                    colorPalette={roleColors[player.role] || "gray"}
                    variant="subtle"
                    fontSize="xs"
                    borderRadius="full"
                    px={2}
                  >
                    {player.role}
                  </Badge>
                  <Text fontSize="xs" color="text.muted">
                    {player.country === "India" ? "🇮🇳" : "🌍"} {player.country}
                  </Text>
                </HStack>
                {(player.battingStyle || player.bowlingStyle) && (
                  <VStack gap={0} align="start">
                    {player.battingStyle && (
                      <Text fontSize="xs" color="text.muted">
                        🏏 {player.battingStyle}
                      </Text>
                    )}
                    {player.bowlingStyle && (
                      <Text fontSize="xs" color="text.muted">
                        🎳 {player.bowlingStyle}
                      </Text>
                    )}
                  </VStack>
                )}
              </VStack>
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default TeamDetail;
