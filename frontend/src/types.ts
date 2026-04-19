export interface TeamInfo {
  id: string;
  shortName: string;
  name: string;
  color: string;
  logo: string;
}

export interface Team extends TeamInfo {
  captain: string;
  homeGround: string;
  players?: Player[];
}

export interface Player {
  id?: string;
  name: string;
  role: string;
  country: string;
  battingStyle?: string;
  bowlingStyle?: string;
  playerImg?: string;
}

export interface LiveDetail {
  batting: string;
  currentOver: string;
  crr: string;
  lastWicket: string;
}

export interface Match {
  matchNo: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  venue: string;
  status: "completed" | "live" | "upcoming";
  result: string | null;
  team1Score: string | null;
  team2Score: string | null;
  team1Info?: TeamInfo;
  team2Info?: TeamInfo;
  type?: string;
  liveDetail?: LiveDetail;
  id?: string;
  name?: string;
  dateTimeGMT?: string;
  statusText?: string;
  matchStarted?: boolean;
  matchEnded?: boolean;
}

export interface PointsTableRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  nrr: number;
  points: number;
  teamName: string;
  shortName: string;
  color: string;
  logo: string;
}

export interface Member {
  id: number;
  name: string;
  avatar: string;
  topTeams: string[];
  topTeamsInfo?: TeamInfo[];
}

export interface MemberCreate {
  name: string;
  avatar: string;
  topTeams: string[];
}

export interface MemberUpdate {
  name?: string;
  avatar?: string;
  topTeams?: string[];
}
