import { useEffect, useState } from "react";
import { Box, Heading, SimpleGrid, Spinner, Center } from "@chakra-ui/react";
import { getTeams } from "../api";
import TeamCard from "../components/TeamCard";
import type { TeamInfo } from "../types";

function Teams() {
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeams()
      .then((res) => setTeams(res.data))
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
      <Heading size="lg" mb={6}>
        IPL Teams
      </Heading>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap={5}>
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

export default Teams;
