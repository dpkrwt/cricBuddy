import axios from "axios";
import type {
  Team,
  Match,
  PointsTableRow,
  Member,
  MemberCreate,
  MemberUpdate,
  TeamInfo,
} from "./types";

const api = axios.create({
  baseURL: "/api",
});

export const getTeams = () => api.get<TeamInfo[]>("/teams");
export const getTeam = (id: string) => api.get<Team>(`/teams/${id}`);
export const getMatches = () => api.get<Match[]>("/matches");
export const getLiveMatches = () => api.get<Match[]>("/matches/live");
export const getUpcomingMatches = () => api.get<Match[]>("/matches/upcoming");
export const getPointsTable = () => api.get<PointsTableRow[]>("/points-table");
export const getPlayoffs = () => api.get<Match[]>("/playoffs");
export const getMembers = () => api.get<Member[]>("/members");
export const createMember = (data: MemberCreate) =>
  api.post<Member>("/members", data);
export const updateMember = (id: number, data: MemberUpdate) =>
  api.put<Member>(`/members/${id}`, data);
export const deleteMember = (id: number) => api.delete(`/members/${id}`);

export default api;
