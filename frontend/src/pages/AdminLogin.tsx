import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Heading, Input, Button, Text, VStack } from "@chakra-ui/react";
import { useAdmin } from "../context/AdminContext";

function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAdmin, logout } = useAdmin();
  const navigate = useNavigate();

  if (isAdmin) {
    return (
      <Box
        maxW="400px"
        mx="auto"
        mt="100px"
        bg="bg.card"
        p={8}
        borderRadius="xl"
        border="1px solid"
        borderColor="border.default"
      >
        <VStack gap={4}>
          <Heading size="lg">Admin Panel</Heading>
          <Text color="green.400" fontWeight="600">
            You are logged in as admin.
          </Text>
          <Button colorPalette="cyan" width="full" onClick={() => navigate("/")}>
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            colorPalette="red"
            width="full"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Logout
          </Button>
        </VStack>
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(password);
      navigate("/");
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      maxW="400px"
      mx="auto"
      mt="100px"
      bg="bg.card"
      p={8}
      borderRadius="xl"
      border="1px solid"
      borderColor="border.default"
    >
      <form onSubmit={handleSubmit}>
        <VStack gap={4}>
          <Heading size="lg">Admin Login</Heading>
          <Text fontSize="sm" color="text.muted">
            Enter password to manage members
          </Text>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            bg="bg.subtle"
            border="1px solid"
            borderColor="border.default"
            _focus={{ borderColor: "accent.solid" }}
            autoFocus
          />
          {error && (
            <Text fontSize="sm" color="red.400">
              {error}
            </Text>
          )}
          <Button
            type="submit"
            colorPalette="cyan"
            width="full"
            loading={loading}
          >
            Login
          </Button>
        </VStack>
      </form>
    </Box>
  );
}

export default AdminLogin;
