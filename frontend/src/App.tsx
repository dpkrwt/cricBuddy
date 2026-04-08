import { Routes, Route } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Matches from "./pages/Matches";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <Box minH="100vh" bg="bg.page">
      <Navbar />
      <Box as="main" maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={6}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:teamId" element={<TeamDetail />} />
        </Routes>
      </Box>
      <Toaster />
    </Box>
  );
}

export default App;
