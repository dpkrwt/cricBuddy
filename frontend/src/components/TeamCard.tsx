import { Box, VStack, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import TeamLogo from "./TeamLogo";
import type { TeamInfo } from "../types";

function TeamCard({ team }: { team: TeamInfo }) {
  return (
    <Link to={`/teams/${team.id}`} style={{ textDecoration: "none" }}>
      <Box
        bg="bg.card"
        borderRadius="xl"
        p={6}
        border="1px solid"
        borderColor="border.default"
        _hover={{
          borderColor: team.color,
          transform: "translateY(-4px)",
          boxShadow: `0 8px 30px ${team.color}22`,
        }}
        transition="all 0.3s"
        cursor="pointer"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="3px"
          bg={team.color}
        />
        <VStack gap={4}>
          <TeamLogo
            src={team.logo}
            alt={team.shortName}
            size="80px"
            bgColor={`${team.color}22`}
            borderWidth="2px"
            borderColor={`${team.color}66`}
          />
          <VStack gap={1}>
            <Text fontWeight="800" fontSize="lg" color="text.primary">
              {team.shortName}
            </Text>
            <Text fontSize="xs" color="text.muted" textAlign="center">
              {team.name}
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Link>
  );
}

export default TeamCard;
