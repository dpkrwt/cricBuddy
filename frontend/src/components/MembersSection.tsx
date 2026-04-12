import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Flex,
  Button,
  Input,
  SimpleGrid,
  Badge,
  IconButton,
  Dialog,
} from "@chakra-ui/react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdDragIndicator,
  MdClose,
} from "react-icons/md";
import {
  getMembers,
  getTeams,
  getPointsTable,
  createMember,
  updateMember,
  deleteMember,
} from "../api";
import TeamLogo from "./TeamLogo";
import type { Member, TeamInfo, PointsTableRow } from "../types";
import { toaster } from "./ui/toaster";

const AVATARS = ["🏏", "🎯", "⭐", "🔥", "🏆", "💪", "🎪", "🦁"];

function MembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [pointsTable, setPointsTable] = useState<PointsTableRow[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberAvatar, setMemberAvatar] = useState("🏏");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([getMembers(), getTeams(), getPointsTable()]).then(
      ([mRes, tRes, ptRes]) => {
        setMembers(mRes.data);
        setAllTeams(tRes.data);
        setPointsTable(ptRes.data);
      },
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableTeams = allTeams.filter((t) => !selectedTeams.includes(t.id));

  const handleOpenAdd = () => {
    setEditingMember(null);
    setMemberName("");
    setMemberAvatar("🏏");
    setSelectedTeams([]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setMemberName(member.name);
    setMemberAvatar(member.avatar);
    setSelectedTeams(member.topTeams || []);
    setDialogOpen(true);
  };

  const handleClose = () => setDialogOpen(false);

  const handleSave = async () => {
    if (!memberName.trim()) {
      toaster.error({ title: "Name is required", duration: 2000 });
      return;
    }
    try {
      if (editingMember) {
        await updateMember(editingMember.id, {
          name: memberName,
          avatar: memberAvatar,
          topTeams: selectedTeams,
        });
        toaster.success({ title: "Member updated!", duration: 2000 });
      } else {
        await createMember({
          name: memberName,
          avatar: memberAvatar,
          topTeams: selectedTeams,
        });
        toaster.success({ title: "Member added!", duration: 2000 });
      }
      fetchData();
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toaster.error({
        title: "Error saving member",
        description: message,
        duration: 3000,
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMember(id);
      toaster.success({ title: "Member removed", duration: 2000 });
      fetchData();
    } catch {
      toaster.error({
        title: "Error deleting member",
        duration: 2000,
      });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (
      source.droppableId === "available" &&
      destination.droppableId === "selected"
    ) {
      if (selectedTeams.length >= 4) {
        toaster.error({
          title: "Maximum 4 teams allowed",
          duration: 2000,
        });
        return;
      }
      const teamId = availableTeams[source.index].id;
      if (!selectedTeams.includes(teamId)) {
        const newSelected = [...selectedTeams];
        newSelected.splice(destination.index, 0, teamId);
        setSelectedTeams(newSelected);
      }
      return;
    }

    if (
      source.droppableId === "selected" &&
      destination.droppableId === "selected"
    ) {
      const reordered = [...selectedTeams];
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      setSelectedTeams(reordered);
    }
  };

  const removeTeam = (teamId: string) => {
    setSelectedTeams(selectedTeams.filter((id) => id !== teamId));
  };

  const getTeamPoints = (teamId: string): number => {
    const row = pointsTable.find((r) => r.teamId === teamId);
    return row ? row.points : 0;
  };

  // Top 4 team IDs from the actual points table
  const actualTop4 = pointsTable.slice(0, 4).map((r) => r.teamId);

  const getTeamPredictionScore = (teamId: string, predictedIndex: number) => {
    const actualIndex = actualTop4.indexOf(teamId);
    if (actualIndex === -1) return 0; // not in top 4
    if (actualIndex === predictedIndex) return 25; // exact position match
    return 10; // in top 4 but wrong position
  };

  const getTeamPredictionStatus = (
    teamId: string,
    predictedIndex: number,
  ): "exact" | "partial" | "miss" => {
    const actualIndex = actualTop4.indexOf(teamId);
    if (actualIndex === -1) return "miss";
    if (actualIndex === predictedIndex) return "exact";
    return "partial";
  };

  const getMemberPoints = (member: Member) => {
    return (member.topTeams || []).reduce(
      (sum, teamId, idx) => sum + getTeamPredictionScore(teamId, idx),
      0,
    );
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">Members</Heading>
        <Button
          colorPalette="cyan"
          variant="outline"
          size="sm"
          onClick={handleOpenAdd}
        >
          <MdAdd />
          Add Member
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {members.map((member) => (
          <Box
            key={member.id}
            bg="bg.card"
            borderRadius="xl"
            p={5}
            border="1px solid"
            borderColor="border.default"
            _hover={{
              borderColor: "text.muted",
            }}
            transition="all 0.2s"
          >
            <Flex justify="space-between" align="start" mb={3}>
              <HStack gap={3}>
                <Flex
                  w="44px"
                  h="44px"
                  borderRadius="full"
                  bg="bg.subtle"
                  align="center"
                  justify="center"
                  fontSize="xl"
                >
                  {member.avatar}
                </Flex>
                <VStack align="start" gap={0}>
                  <Text fontWeight="700" fontSize="md" color="text.primary">
                    {member.name}
                  </Text>
                  <Text fontSize="xs" color="accent.solid" fontWeight="600">
                    {getMemberPoints(member)} pts
                  </Text>
                </VStack>
              </HStack>
              <HStack gap={1}>
                <IconButton
                  size="xs"
                  variant="ghost"
                  color="text.muted"
                  _hover={{ color: "accent.solid" }}
                  onClick={() => handleOpenEdit(member)}
                  aria-label="Edit"
                >
                  <MdEdit />
                </IconButton>
                <IconButton
                  size="xs"
                  variant="ghost"
                  color="text.muted"
                  _hover={{ color: "red.400" }}
                  onClick={() => handleDelete(member.id)}
                  aria-label="Delete"
                >
                  <MdDelete />
                </IconButton>
              </HStack>
            </Flex>

            <VStack gap={2} align="stretch">
              {(member.topTeamsInfo || []).map((team, idx) => {
                const status = getTeamPredictionStatus(
                  team.id,
                  member.topTeams.indexOf(team.id),
                );
                const score = getTeamPredictionScore(
                  team.id,
                  member.topTeams.indexOf(team.id),
                );
                return (
                  <HStack
                    key={team.id}
                    gap={3}
                    bg="bg.subtle"
                    px={3}
                    py={2}
                    borderRadius="lg"
                    borderLeft="3px solid"
                    borderLeftColor={
                      status === "exact"
                        ? "green.400"
                        : status === "partial"
                          ? "yellow.400"
                          : team.color
                    }
                  >
                    <Badge
                      colorPalette="gray"
                      variant="subtle"
                      fontSize="10px"
                      borderRadius="full"
                      px={1.5}
                      minW="20px"
                      textAlign="center"
                    >
                      #{idx + 1}
                    </Badge>
                    <TeamLogo
                      src={team.logo}
                      alt={team.shortName}
                      size="24px"
                      bgColor={`${team.color}22`}
                    />
                    <Text
                      fontWeight="600"
                      fontSize="sm"
                      flex={1}
                      color="text.primary"
                    >
                      {team.shortName}
                    </Text>
                    <Badge
                      colorPalette={
                        status === "exact"
                          ? "green"
                          : status === "partial"
                            ? "yellow"
                            : "gray"
                      }
                      variant="subtle"
                      fontSize="10px"
                      borderRadius="full"
                      px={2}
                    >
                      {status === "exact"
                        ? "✓ 25pts"
                        : status === "partial"
                          ? "~ 10pts"
                          : "0pts"}
                    </Badge>
                  </HStack>
                );
              })}
              {(member.topTeamsInfo || []).length === 0 && (
                <Text
                  fontSize="sm"
                  color="text.muted"
                  textAlign="center"
                  py={2}
                >
                  No teams selected
                </Text>
              )}
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      <Dialog.Root
        open={dialogOpen}
        onOpenChange={(e) => setDialogOpen(e.open)}
        size="xl"
        placement="center"
      >
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.page"
            border="1px solid"
            borderColor="border.default"
            borderRadius="xl"
          >
            <Dialog.Header>
              <Dialog.Title>
                {editingMember ? "Edit Member" : "Add Member"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <IconButton
                variant="ghost"
                aria-label="Close"
                size="sm"
                position="absolute"
                top={3}
                right={3}
              >
                <MdClose />
              </IconButton>
            </Dialog.CloseTrigger>
            <Dialog.Body>
              <VStack gap={5} align="stretch">
                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    mb={2}
                    color="text.secondary"
                  >
                    Name
                  </Text>
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Enter member name"
                    bg="bg.subtle"
                    border="1px solid"
                    borderColor="border.default"
                    _focus={{ borderColor: "accent.solid" }}
                  />
                </Box>

                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    mb={2}
                    color="text.secondary"
                  >
                    Avatar
                  </Text>
                  <HStack gap={2} flexWrap="wrap">
                    {AVATARS.map((a) => (
                      <Box
                        key={a}
                        w="40px"
                        h="40px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="lg"
                        fontSize="xl"
                        cursor="pointer"
                        bg={memberAvatar === a ? "bg.card.hover" : "bg.subtle"}
                        border="2px solid"
                        borderColor={
                          memberAvatar === a ? "accent.solid" : "transparent"
                        }
                        onClick={() => setMemberAvatar(a)}
                        _hover={{ bg: "bg.card.hover" }}
                        transition="all 0.2s"
                      >
                        {a}
                      </Box>
                    ))}
                  </HStack>
                </Box>

                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    mb={1}
                    color="text.secondary"
                  >
                    Top 4 Teams (drag to add &amp; reorder)
                  </Text>
                  <Text fontSize="xs" color="text.muted" mb={3}>
                    Predict the top 4 teams in order. Exact position = 25pts, in
                    top 4 but wrong position = 10pts, not in top 4 = 0pts. Max:
                    100pts.
                  </Text>

                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Box mb={4}>
                      <Text
                        fontSize="xs"
                        fontWeight="600"
                        color="accent.solid"
                        mb={2}
                      >
                        YOUR PICKS ({selectedTeams.length}/4)
                      </Text>
                      <Droppable droppableId="selected">
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            minH="60px"
                            bg={
                              snapshot.isDraggingOver
                                ? "bg.card.hover"
                                : "bg.subtle"
                            }
                            borderRadius="lg"
                            p={2}
                            border="2px dashed"
                            borderColor={
                              snapshot.isDraggingOver
                                ? "accent.solid"
                                : "border.default"
                            }
                            transition="all 0.2s"
                          >
                            {selectedTeams.length === 0 && (
                              <Text
                                fontSize="sm"
                                color="text.muted"
                                textAlign="center"
                                py={3}
                              >
                                Drag teams here
                              </Text>
                            )}
                            {selectedTeams.map((teamId, idx) => {
                              const team = allTeams.find(
                                (t) => t.id === teamId,
                              );
                              if (!team) return null;
                              return (
                                <Draggable
                                  key={teamId}
                                  draggableId={`selected-${teamId}`}
                                  index={idx}
                                >
                                  {(provided, snapshot) => (
                                    <HStack
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      gap={3}
                                      bg={
                                        snapshot.isDragging
                                          ? "bg.card.hover"
                                          : "bg.card"
                                      }
                                      px={3}
                                      py={2}
                                      mb={1}
                                      borderRadius="lg"
                                      border="1px solid"
                                      borderColor={
                                        snapshot.isDragging
                                          ? "accent.solid"
                                          : "border.default"
                                      }
                                      boxShadow={
                                        snapshot.isDragging
                                          ? "0 4px 20px rgba(0,188,212,0.3)"
                                          : "none"
                                      }
                                    >
                                      <Box
                                        {...provided.dragHandleProps}
                                        color="text.muted"
                                        cursor="grab"
                                      >
                                        <MdDragIndicator />
                                      </Box>
                                      <Badge
                                        colorPalette={
                                          getTeamPoints(teamId) > 0
                                            ? "green"
                                            : "gray"
                                        }
                                        fontSize="xs"
                                        borderRadius="full"
                                        px={2}
                                      >
                                        #{idx + 1}
                                      </Badge>
                                      <TeamLogo
                                        src={team.logo}
                                        alt={team.shortName}
                                        size="24px"
                                        bgColor={`${team.color}22`}
                                      />
                                      <Text
                                        fontSize="sm"
                                        fontWeight="600"
                                        flex={1}
                                        color="text.primary"
                                      >
                                        {team.shortName}
                                      </Text>
                                      <Text fontSize="xs" color="text.muted">
                                        {getTeamPoints(teamId)}pts
                                      </Text>
                                      <IconButton
                                        size="xs"
                                        variant="ghost"
                                        color="text.muted"
                                        _hover={{ color: "red.400" }}
                                        onClick={() => removeTeam(teamId)}
                                        aria-label="Remove"
                                      >
                                        <MdClose />
                                      </IconButton>
                                    </HStack>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </Box>
                        )}
                      </Droppable>
                    </Box>

                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="600"
                        color="text.muted"
                        mb={2}
                      >
                        AVAILABLE TEAMS
                      </Text>
                      <Droppable droppableId="available">
                        {(provided) => (
                          <SimpleGrid
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            columns={2}
                            gap={1}
                          >
                            {availableTeams.map((team, idx) => (
                              <Draggable
                                key={team.id}
                                draggableId={`available-${team.id}`}
                                index={idx}
                              >
                                {(provided, snapshot) => (
                                  <HStack
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    gap={2}
                                    bg={
                                      snapshot.isDragging
                                        ? "bg.card.hover"
                                        : "bg.subtle"
                                    }
                                    px={3}
                                    py={2}
                                    borderRadius="lg"
                                    cursor="grab"
                                    border="1px solid"
                                    borderColor={
                                      snapshot.isDragging
                                        ? "accent.solid"
                                        : "transparent"
                                    }
                                    _hover={{ bg: "bg.card.hover" }}
                                    transition="all 0.2s"
                                    opacity={
                                      selectedTeams.length >= 4 ? 0.5 : 1
                                    }
                                  >
                                    <MdDragIndicator color="rgba(255,255,255,0.3)" />
                                    <TeamLogo
                                      src={team.logo}
                                      alt={team.shortName}
                                      size="20px"
                                      bgColor={`${team.color}22`}
                                    />
                                    <Text
                                      fontSize="xs"
                                      fontWeight="600"
                                      color="text.primary"
                                    >
                                      {team.shortName}
                                    </Text>
                                  </HStack>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </SimpleGrid>
                        )}
                      </Droppable>
                    </Box>
                  </DragDropContext>
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button
                variant="ghost"
                onClick={handleClose}
                color="text.secondary"
              >
                Cancel
              </Button>
              <Button colorPalette="cyan" onClick={handleSave}>
                {editingMember ? "Update" : "Add Member"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}

export default MembersSection;
