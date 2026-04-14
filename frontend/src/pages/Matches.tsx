import { useEffect, useState, type SyntheticEvent } from "react";
import {
  Box,
  Heading,
  Text,
  Flex,
  HStack,
  VStack,
  Badge,
  Spinner,
  Center,
  Tabs,
  Table,
} from "@chakra-ui/react";
import { getMatches, getPointsTable, getPlayoffs } from "../api";
import TeamLogo from "../components/TeamLogo";
import type { Match, PointsTableRow } from "../types";

function MatchRow({ match }: { match: Match }) {
  const dateObj = match.dateTimeGMT
    ? new Date(match.dateTimeGMT + "Z")
    : new Date(match.date + "T" + (match.time || "00:00") + ":00Z");
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusColor =
    match.status === "live"
      ? "red"
      : match.status === "completed"
        ? "green"
        : "blue";

  return (
    <Box
      bg="bg.card"
      borderRadius="xl"
      p={4}
      border="1px solid"
      borderColor={match.status === "live" ? "red.800" : "border.default"}
      _hover={{ borderColor: "text.muted" }}
      transition="all 0.2s"
    >
      <HStack justify="space-between" mb={3}>
        <HStack gap={2}>
          <Text fontSize="xs" color="text.muted">
            {match.matchNo ? `Match ${match.matchNo}` : ""}
          </Text>
          <Badge
            colorPalette={statusColor}
            variant="subtle"
            fontSize="10px"
            borderRadius="full"
            px={2}
          >
            {match.status === "live" ? "● LIVE" : match.status.toUpperCase()}
          </Badge>
          {match.type && (
            <Badge
              colorPalette="purple"
              variant="solid"
              fontSize="10px"
              borderRadius="full"
              px={2}
            >
              {match.type}
            </Badge>
          )}
        </HStack>
        <HStack gap={2}>
          <Text fontSize="xs" color="accent.solid">
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
            size="36px"
            bgColor={`${match.team1Info?.color}22`}
          />
          <VStack align="start" gap={0}>
            <Text fontWeight="700" fontSize="sm" color="text.primary">
              {match.team1Info?.shortName}
            </Text>
            {match.team1Score && (
              <Text fontSize="xs" color="text.secondary">
                {match.team1Score}
              </Text>
            )}
          </VStack>
        </HStack>
        <Text fontSize="xs" fontWeight="700" color="text.muted" px={3}>
          vs
        </Text>
        <HStack gap={3} flex={1} justify="flex-end">
          <VStack align="end" gap={0}>
            <Text fontWeight="700" fontSize="sm" color="text.primary">
              {match.team2Info?.shortName}
            </Text>
            {match.team2Score && (
              <Text fontSize="xs" color="text.secondary">
                {match.team2Score}
              </Text>
            )}
          </VStack>
          <TeamLogo
            src={match.team2Info?.logo}
            alt={match.team2Info?.shortName}
            size="36px"
            bgColor={`${match.team2Info?.color}22`}
          />
        </HStack>
      </Flex>

      {(match.result || match.statusText) && (
        <Text
          fontSize="xs"
          color="accent.solid"
          mt={2}
          textAlign="center"
          fontWeight="600"
        >
          {match.result || match.statusText}
        </Text>
      )}
      <Text fontSize="xs" color="text.muted" mt={1} textAlign="center">
        {match.venue}
      </Text>
    </Box>
  );
}

function PointsTableSection({
  pointsTable,
}: {
  pointsTable: PointsTableRow[];
}) {
  return (
    <Table.ScrollArea>
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader color="text.muted" borderColor="border.default">
              #
            </Table.ColumnHeader>
            <Table.ColumnHeader color="text.muted" borderColor="border.default">
              Team
            </Table.ColumnHeader>
            <Table.ColumnHeader
              color="text.muted"
              borderColor="border.default"
              textAlign="end"
            >
              P
            </Table.ColumnHeader>
            <Table.ColumnHeader
              color="text.muted"
              borderColor="border.default"
              textAlign="end"
            >
              W
            </Table.ColumnHeader>
            <Table.ColumnHeader
              color="text.muted"
              borderColor="border.default"
              textAlign="end"
            >
              L
            </Table.ColumnHeader>
            <Table.ColumnHeader
              color="text.muted"
              borderColor="border.default"
              textAlign="end"
            >
              NRR
            </Table.ColumnHeader>
            <Table.ColumnHeader
              color="text.muted"
              borderColor="border.default"
              textAlign="end"
            >
              Pts
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {pointsTable.map((row, i) => (
            <Table.Row
              key={row.teamId}
              bg={i < 4 ? "bg.subtle" : "transparent"}
              _hover={{ bg: "bg.card.hover" }}
            >
              <Table.Cell
                borderColor="border.default"
                fontWeight="600"
                color="text.muted"
              >
                {i + 1}
              </Table.Cell>
              <Table.Cell borderColor="border.default">
                <HStack gap={3}>
                  <TeamLogo
                    src={row.logo}
                    alt={row.shortName}
                    size="32px"
                    bgColor={`${row.color}22`}
                  />
                  <VStack align="start" gap={0}>
                    <Text fontWeight="700" fontSize="sm" color="text.primary">
                      {row.shortName}
                    </Text>
                    <Text
                      fontSize="xs"
                      color="text.muted"
                      display={{ base: "none", md: "block" }}
                    >
                      {row.teamName}
                    </Text>
                  </VStack>
                  {i < 4 && (
                    <Badge
                      colorPalette="green"
                      variant="subtle"
                      fontSize="9px"
                      borderRadius="full"
                    >
                      Q
                    </Badge>
                  )}
                </HStack>
              </Table.Cell>
              <Table.Cell
                borderColor="border.default"
                textAlign="end"
                color="text.primary"
              >
                {row.played}
              </Table.Cell>
              <Table.Cell
                borderColor="border.default"
                textAlign="end"
                color="green.300"
              >
                {row.won}
              </Table.Cell>
              <Table.Cell
                borderColor="border.default"
                textAlign="end"
                color="red.300"
              >
                {row.lost}
              </Table.Cell>
              <Table.Cell
                borderColor="border.default"
                textAlign="end"
                color={row.nrr >= 0 ? "green.300" : "red.300"}
              >
                {row.nrr > 0 ? "+" : ""}
                {row.nrr.toFixed(3)}
              </Table.Cell>
              <Table.Cell
                borderColor="border.default"
                textAlign="end"
                fontWeight="900"
                fontSize="md"
                color="text.primary"
              >
                {row.points}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}

function PlayoffsSection({ playoffs }: { playoffs: Match[] }) {
  if (!playoffs.length)
    return (
      <Text color="text.muted">Playoffs info will be available soon.</Text>
    );

  const stageColors: Record<string, string> = {
    "Qualifier 1": "green",
    Eliminator: "orange",
    "Qualifier 2": "blue",
    Final: "yellow",
  };

  return (
    <VStack gap={4} align="stretch">
      {playoffs.map((match) => (
        <Box
          key={match.id || match.matchNo}
          bg="bg.card"
          borderRadius="xl"
          p={5}
          border="1px solid"
          borderColor="border.default"
          position="relative"
          overflow="hidden"
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            bottom={0}
            w="4px"
            bg={`${stageColors[match.type || ""]}.400`}
          />
          <HStack justify="space-between" mb={3}>
            <Badge
              colorPalette={stageColors[match.type || ""]}
              variant="solid"
              fontSize="xs"
              borderRadius="full"
              px={3}
              py={1}
            >
              {match.type}
            </Badge>
            <Text fontSize="xs" color="text.muted">
              {new Date(match.date).toLocaleDateString("en-IN", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </HStack>
          <Flex justify="center" align="center" gap={8}>
            <VStack>
              <Text fontWeight="800" fontSize="xl" color="text.muted">
                {match.team1Info?.shortName}
              </Text>
            </VStack>
            <Text fontWeight="900" color="text.muted">
              VS
            </Text>
            <VStack>
              <Text fontWeight="800" fontSize="xl" color="text.muted">
                {match.team2Info?.shortName}
              </Text>
            </VStack>
          </Flex>
          <Text fontSize="xs" color="text.muted" mt={2} textAlign="center">
            {match.venue}
          </Text>
        </Box>
      ))}
    </VStack>
  );
}

function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [pointsTable, setPointsTable] = useState<PointsTableRow[]>([]);
  const [playoffs, setPlayoffs] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMatches(), getPointsTable(), getPlayoffs()])
      .then(([matchesRes, ptRes, playoffsRes]) => {
        setMatches(matchesRes.data);
        setPointsTable(ptRes.data);
        setPlayoffs(playoffsRes.data);
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
      <Heading size="lg" mb={6}>
        IPL 2026
      </Heading>
      <Tabs.Root defaultValue="schedule" variant="enclosed" colorPalette="cyan">
        <Tabs.List mb={6} flexWrap="wrap" gap={2}>
          <Tabs.Trigger
            value="schedule"
            color="text.secondary"
            _selected={{ color: "text.primary", bg: "bg.card.hover" }}
            fontSize="sm"
          >
            Fixtures
          </Tabs.Trigger>
          <Tabs.Trigger
            value="results"
            color="text.secondary"
            _selected={{ color: "text.primary", bg: "bg.card.hover" }}
            fontSize="sm"
          >
            Results
          </Tabs.Trigger>
          <Tabs.Trigger
            value="points"
            color="text.secondary"
            _selected={{ color: "text.primary", bg: "bg.card.hover" }}
            fontSize="sm"
          >
            Points Table
          </Tabs.Trigger>
          <Tabs.Trigger
            value="playoffs"
            color="text.secondary"
            _selected={{ color: "text.primary", bg: "bg.card.hover" }}
            fontSize="sm"
          >
            Playoffs
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="schedule" px={0}>
          <VStack gap={3} align="stretch">
            {matches
              .filter((m) => !m.type && !m.matchEnded)
              .map((m) => (
                <MatchRow key={m.id || m.matchNo} match={m} />
              ))}
          </VStack>
        </Tabs.Content>
        <Tabs.Content value="results" px={0}>
          <VStack gap={3} align="stretch">
            {matches
              .filter((m) => !m.type && m.matchEnded)
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((m) => (
                <MatchRow key={m.id || m.matchNo} match={m} />
              ))}
          </VStack>
        </Tabs.Content>
        <Tabs.Content value="points" px={0}>
          <Box
            bg="bg.card"
            borderRadius="xl"
            p={4}
            border="1px solid"
            borderColor="border.default"
          >
            <PointsTableSection pointsTable={pointsTable} />
          </Box>
        </Tabs.Content>
        <Tabs.Content value="playoffs" px={0}>
          <PlayoffsSection playoffs={playoffs} />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}

export default Matches;
