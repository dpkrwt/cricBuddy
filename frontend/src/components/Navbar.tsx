import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  IconButton,
  VStack,
  Drawer,
  Badge,
} from "@chakra-ui/react";
import { Link, useLocation } from "react-router-dom";
import { HiMenu } from "react-icons/hi";
import {
  MdSportsCricket,
  MdDashboard,
  MdSchedule,
  MdGroups,
  MdClose,
  MdLogout,
} from "react-icons/md";
import { ColorModeButton } from "./ui/color-mode";
import { useAdmin } from "../context/AdminContext";
import type { IconType } from "react-icons";

interface NavItem {
  label: string;
  path: string;
  icon: IconType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: MdDashboard },
  { label: "Matches", path: "/matches", icon: MdSchedule },
  { label: "Teams", path: "/teams", icon: MdGroups },
];

function Navbar() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isAdmin, logout } = useAdmin();

  return (
    <Box
      as="nav"
      bg="nav.bg"
      borderBottom="1px solid"
      borderColor="border.default"
      position="sticky"
      top={0}
      zIndex={100}
      backdropFilter="blur(10px)"
    >
      <Flex
        maxW="1400px"
        mx="auto"
        px={{ base: 4, md: 6 }}
        h="64px"
        align="center"
        justify="space-between"
      >
        <HStack gap={2} asChild>
          <Link to="/" style={{ textDecoration: "none" }}>
            <Box color="accent.solid" fontSize="28px">
              <MdSportsCricket />
            </Box>
            <Text fontSize="xl" fontWeight="800" color="accent.solid">
              CricBuddy
            </Text>
            <Text
              fontSize="xs"
              color="text.muted"
              fontWeight="600"
              ml={1}
              mt={1}
            >
              IPL {new Date().getFullYear()}
            </Text>
          </Link>
        </HStack>

        <HStack gap={2}>
          <HStack gap={1} display={{ base: "none", md: "flex" }}>
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <Box
                  asChild
                  key={item.path}
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontSize="sm"
                  fontWeight="600"
                  display="flex"
                  alignItems="center"
                  gap={2}
                  bg={isActive ? "bg.card.hover" : "transparent"}
                  color={isActive ? "accent.solid" : "text.secondary"}
                  _hover={{
                    bg: "bg.card.hover",
                    color: "text.primary",
                    textDecoration: "none",
                  }}
                  transition="all 0.2s"
                >
                  <Link to={item.path}>
                    <item.icon />
                    {item.label}
                  </Link>
                </Box>
              );
            })}
          </HStack>
          <ColorModeButton
            color="text.primary"
            _hover={{ bg: "bg.card.hover" }}
            display={{ base: "none", md: "flex" }}
          />
          {isAdmin && (
            <HStack gap={1} display={{ base: "none", md: "flex" }}>
              <Badge colorPalette="green" variant="subtle" fontSize="xs">
                Admin
              </Badge>
              <IconButton
                size="xs"
                variant="ghost"
                color="text.muted"
                _hover={{ color: "red.400" }}
                onClick={logout}
                aria-label="Logout"
              >
                <MdLogout />
              </IconButton>
            </HStack>
          )}
        </HStack>

        <HStack gap={2} display={{ base: "flex", md: "none" }}>
          <ColorModeButton color="text.primary" />
          <IconButton
            variant="ghost"
            color="text.primary"
            fontSize="24px"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
          >
            <HiMenu />
          </IconButton>
        </HStack>
      </Flex>

      <Drawer.Root
        open={drawerOpen}
        onOpenChange={(e) => setDrawerOpen(e.open)}
        placement="end"
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg="bg.page">
            <Drawer.CloseTrigger asChild>
              <IconButton
                variant="ghost"
                color="text.primary"
                aria-label="Close"
                position="absolute"
                top={3}
                right={3}
              >
                <MdClose />
              </IconButton>
            </Drawer.CloseTrigger>
            <Drawer.Body pt={12}>
              <VStack gap={4} align="stretch">
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Box
                      asChild
                      key={item.path}
                      px={4}
                      py={3}
                      borderRadius="lg"
                      fontSize="md"
                      fontWeight="600"
                      display="flex"
                      alignItems="center"
                      gap={3}
                      bg={isActive ? "bg.card.hover" : "transparent"}
                      color={isActive ? "accent.solid" : "text.secondary"}
                      _hover={{
                        bg: "bg.card.hover",
                        color: "text.primary",
                        textDecoration: "none",
                      }}
                    >
                      <Link to={item.path} onClick={() => setDrawerOpen(false)}>
                        <item.icon size={20} />
                        {item.label}
                      </Link>
                    </Box>
                  );
                })}
              </VStack>
              {isAdmin && (
                <HStack gap={2} px={4} py={3}>
                  <Badge colorPalette="green" variant="subtle" fontSize="xs">
                    Admin
                  </Badge>
                  <Text
                    fontSize="sm"
                    color="red.400"
                    cursor="pointer"
                    onClick={() => {
                      logout();
                      setDrawerOpen(false);
                    }}
                  >
                    Logout
                  </Text>
                </HStack>
              )}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </Box>
  );
}

export default Navbar;
