from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import re
import logging
import secrets

from .data import TEAMS, SCHEDULE, MEMBERS
from .cricket_api import cricket_api
from . import database as db

logger = logging.getLogger(__name__)

app = FastAPI(title="CricBuddy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cricbuddy.onrender.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialize PostgreSQL ──
try:
    db.init_db()
    db.seed_members(MEMBERS)
    db.seed_admin("deepak@cricbuddy")
except Exception as e:
    logger.warning(f"Could not initialize database: {e}")


class MemberCreate(BaseModel):
    name: str
    avatar: Optional[str] = "🏏"
    topTeams: List[str] = []


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    topTeams: Optional[List[str]] = None


class AdminLogin(BaseModel):
    password: str


# ── Admin auth ──
_admin_tokens: set[str] = set()


def _verify_admin(token: str):
    if token not in _admin_tokens:
        raise HTTPException(401, "Unauthorized – admin login required")


@app.post("/api/admin/login")
def admin_login(body: AdminLogin):
    if not db.verify_admin_password(body.password):
        raise HTTPException(401, "Invalid password")
    token = secrets.token_hex(32)
    _admin_tokens.add(token)
    return {"token": token}


@app.post("/api/admin/logout")
def admin_logout(token: str = ""):
    _admin_tokens.discard(token)
    return {"message": "Logged out"}


# ── Helpers ──────────────────────────────────────────────────────
def _team_map():
    return {t["id"]: t for t in TEAMS}


def _team_brief(team):
    if not team:
        return {"shortName": "TBD", "name": "TBD", "color": "#666", "logo": ""}
    return {
        "shortName": team["shortName"],
        "name": team["name"],
        "color": team["color"],
        "logo": team["logo"],
    }


# Map API shortnames to our static team data for color lookup
_SHORTNAME_TO_ID = {t["shortName"].upper(): t["id"] for t in TEAMS}
# Handle API quirks (e.g. RCBW -> RCB)
_SHORTNAME_TO_ID["RCBW"] = "rcb"

# Reverse: our shortname -> API shortname(s)
_ID_TO_API_SHORTNAMES = {"rcb": ["RCBW", "RCB"]}


def _normalize_api_match(api_match: dict) -> dict:
    """Convert a CricketData.org match object to our internal format."""
    team_info_list = api_match.get("teamInfo") or []
    t1_api = team_info_list[0] if len(team_info_list) > 0 else {}
    t2_api = team_info_list[1] if len(team_info_list) > 1 else {}

    tm = _team_map()

    def _build_team_info(api_t: dict) -> dict:
        sn = api_t.get("shortname", "")
        static_id = _SHORTNAME_TO_ID.get(sn.upper(), sn.lower())
        static = tm.get(static_id)
        return {
            "shortName": static["shortName"] if static else sn,
            "name": api_t.get("name", static["name"] if static else ""),
            "color": static["color"] if static else "#666",
            "logo": api_t.get("img") or (static["logo"] if static else ""),
        }

    t1_info = _build_team_info(t1_api)
    t2_info = _build_team_info(t2_api)

    # Parse scores from API score array
    scores = api_match.get("score") or []
    t1_name_lower = (t1_api.get("name") or "").lower()
    t2_name_lower = (t2_api.get("name") or "").lower()
    t1_sn_lower = (t1_api.get("shortname") or "").lower()
    t2_sn_lower = (t2_api.get("shortname") or "").lower()
    t1_score = None
    t2_score = None
    for s in scores:
        inning = (s.get("inning") or "").lower()
        score_str = f"{s.get('r', 0)}/{s.get('w', 0)} ({s.get('o', 0)})"
        if t1_name_lower and t1_name_lower in inning:
            t1_score = score_str
        elif t2_name_lower and t2_name_lower in inning:
            t2_score = score_str
        elif t1_sn_lower and t1_sn_lower in inning:
            t1_score = score_str
        elif t2_sn_lower and t2_sn_lower in inning:
            t2_score = score_str

    # Determine status
    started = api_match.get("matchStarted", False)
    ended = api_match.get("matchEnded", False)
    if not started:
        status = "upcoming"
    elif started and not ended:
        status = "live"
    else:
        status = "completed"

    # Extract match number from name, e.g. "..., 12th Match, ..."
    match_name = api_match.get("name", "")
    match_no_match = re.search(r"(\d+)\w*\s+Match", match_name)
    match_no = int(match_no_match.group(1)) if match_no_match else 0

    api_status_text = api_match.get("status", "")

    return {
        "id": api_match.get("id", ""),
        "matchNo": match_no,
        "name": match_name,
        "date": api_match.get("date", ""),
        "dateTimeGMT": api_match.get("dateTimeGMT", ""),
        "time": "",
        "team1": (t1_api.get("shortname") or "").lower(),
        "team2": (t2_api.get("shortname") or "").lower(),
        "venue": api_match.get("venue", ""),
        "status": status,
        "result": api_status_text if status == "completed" else None,
        "statusText": api_status_text,
        "team1Score": t1_score,
        "team2Score": t2_score,
        "team1Info": t1_info,
        "team2Info": t2_info,
        "matchStarted": started,
        "matchEnded": ended,
    }


# ─── Status ───
@app.get("/api/status")
def get_status():
    return {
        "status": "ok",
        "liveDataEnabled": cricket_api.enabled,
        "dataSource": "CricketData.org API"
        if cricket_api.enabled
        else "Static mock data",
        "message": (
            "Using live cricket data"
            if cricket_api.enabled
            else "Get your free API key at https://cricketdata.org/member.aspx"
        ),
    }


# ─── Series (NEW) ───
@app.get("/api/series/current")
def get_current_series():
    """Get the latest IPL series info from CricketData.org"""
    if not cricket_api.enabled:
        return {
            "source": "static",
            "series": {
                "name": "Indian Premier League 2025",
                "startDate": "2025-03-22",
                "endDate": "2025-05-25",
            },
        }
    series = cricket_api.get_latest_ipl_series()
    if not series:
        raise HTTPException(502, "Could not fetch series data from CricketData.org")
    return {"source": "live", "series": series}


@app.get("/api/series/{series_id}/info")
def get_series_info(series_id: str):
    """Get full series info (including match list) by series ID"""
    if not cricket_api.enabled:
        raise HTTPException(
            400,
            "Live data is not enabled. Set USE_LIVE_DATA=true and provide an API key.",
        )
    info = cricket_api.get_series_info(series_id)
    if not info:
        raise HTTPException(502, "Could not fetch series info")
    return {"source": "live", "data": info}


@app.get("/api/series/{series_id}/matches")
def get_series_matches(series_id: str):
    """Get all matches for a series"""
    if not cricket_api.enabled:
        raise HTTPException(400, "Live data is not enabled")
    matches = cricket_api.get_series_matches(series_id)
    if matches is None:
        raise HTTPException(502, "Could not fetch series matches")
    return {"source": "live", "matches": matches}


# ─── Teams ───
@app.get("/api/teams")
def get_teams():
    """Return teams, enriched with API logos and squad info when live data is available."""
    if cricket_api.enabled:
        # Build logo map from ipl_data
        api_teams = {}
        ipl_data = cricket_api.get_ipl_data()
        if ipl_data and ipl_data.get("teams"):
            api_teams = {t["shortName"].upper(): t for t in ipl_data["teams"]}

        # Build squad map from series_squad keyed by uppercase shortname
        squad_map = {}
        squad = cricket_api.get_ipl_squad()
        if squad:
            for sq in squad:
                sq_sn = (sq.get("shortname") or "").upper()
                if sq_sn:
                    squad_map[sq_sn] = sq

        if api_teams or squad_map:
            enriched = []
            for t in TEAMS:
                team = {k: v for k, v in t.items() if k != "players"}
                sn = t["shortName"].upper()
                aliases = _ID_TO_API_SHORTNAMES.get(t["id"], [])

                # Enrich logo
                api_t = api_teams.get(sn)
                if not api_t:
                    for alias in aliases:
                        api_t = api_teams.get(alias)
                        if api_t:
                            break
                if api_t and api_t.get("img"):
                    team["logo"] = api_t["img"]

                # Enrich with squad image (fallback) and player count
                sq = squad_map.get(sn)
                if not sq:
                    for alias in aliases:
                        sq = squad_map.get(alias)
                        if sq:
                            break
                if sq:
                    if not team.get("logo") or "ui-avatars" in team.get("logo", ""):
                        if sq.get("img"):
                            team["logo"] = sq["img"]
                    team["playerCount"] = len(sq.get("players", []))

                enriched.append(team)
            return enriched

    return [{k: v for k, v in t.items() if k != "players"} for t in TEAMS]


@app.get("/api/teams/{team_id}")
def get_team(team_id: str):
    for t in TEAMS:
        if t["id"] == team_id:
            team = {**t}
            if cricket_api.enabled:
                # Enrich with API logo
                ipl_data = cricket_api.get_ipl_data()
                if ipl_data and ipl_data.get("teams"):
                    api_teams = {
                        at["shortName"].upper(): at for at in ipl_data["teams"]
                    }
                    sn = t["shortName"].upper()
                    api_t = api_teams.get(sn)
                    if not api_t:
                        for alias in _ID_TO_API_SHORTNAMES.get(t["id"], []):
                            api_t = api_teams.get(alias)
                            if api_t:
                                break
                    if api_t and api_t.get("img"):
                        team["logo"] = api_t["img"]

                # Enrich players from series squad
                squad = cricket_api.get_ipl_squad()
                if squad:
                    sn_upper = t["shortName"].upper()
                    aliases = _ID_TO_API_SHORTNAMES.get(t["id"], [])
                    for squad_team in squad:
                        api_sn = (squad_team.get("shortname") or "").upper()
                        if api_sn == sn_upper or api_sn in aliases:
                            team["players"] = [
                                {
                                    "id": p.get("id", ""),
                                    "name": p.get("name", ""),
                                    "role": p.get("role", ""),
                                    "battingStyle": p.get("battingStyle", ""),
                                    "bowlingStyle": p.get("bowlingStyle", ""),
                                    "country": p.get("country", ""),
                                    "playerImg": p.get("playerImg", ""),
                                }
                                for p in squad_team.get("players", [])
                            ]
                            break
            return team
    raise HTTPException(404, "Team not found")


# ─── Matches ───
@app.get("/api/matches")
def get_matches():
    """Return all IPL matches. Uses series_info if available, falls back to currentMatches, then static."""
    if cricket_api.enabled:
        ipl_data = cricket_api.get_ipl_data()
        if ipl_data and ipl_data.get("matches"):
            match_list = ipl_data["matches"]
            # Merge score data from currentMatches into series matches
            current = cricket_api.get_current_matches() or []
            score_map = {m["id"]: m for m in current}
            normalized = []
            for m in match_list:
                # If we have richer data from currentMatches (with scores), use that
                enriched = score_map.get(m.get("id"), m)
                normalized.append(_normalize_api_match(enriched))
            # Sort by date, then matchNo
            normalized.sort(key=lambda x: (x["date"], x["matchNo"]))
            return normalized

        # Fallback: use currentMatches only (no series data)
        current = cricket_api.get_current_matches()
        if current:
            normalized = [_normalize_api_match(m) for m in current]
            normalized.sort(key=lambda x: (x["date"], x["matchNo"]))
            return normalized

    # Fallback to static data
    tm = _team_map()
    enriched = []
    for m in SCHEDULE:
        match = {**m}
        match["team1Info"] = _team_brief(tm.get(m["team1"]))
        match["team2Info"] = _team_brief(tm.get(m["team2"]))
        enriched.append(match)
    return enriched


@app.get("/api/matches/live")
def get_live_matches():
    """Get only currently ongoing matches (matchStarted=True, matchEnded=False)."""
    if cricket_api.enabled:
        current = cricket_api.get_current_matches()
        if current is not None:
            # Filter for truly ongoing matches only
            live = [
                m
                for m in current
                if m.get("matchStarted", False) and not m.get("matchEnded", False)
            ]
            return [_normalize_api_match(m) for m in live]

    # Fallback to static data
    tm = _team_map()
    live = [m for m in SCHEDULE if m["status"] == "live"]
    enriched = []
    for m in live:
        match = {**m}
        match["team1Info"] = _team_brief(tm.get(m["team1"]))
        match["team2Info"] = _team_brief(tm.get(m["team2"]))
        enriched.append(match)
    return enriched


@app.get("/api/matches/upcoming")
def get_upcoming_matches():
    """Get upcoming matches."""
    if cricket_api.enabled:
        ipl_data = cricket_api.get_ipl_data()
        if ipl_data and ipl_data.get("matches"):
            upcoming = [
                _normalize_api_match(m)
                for m in ipl_data["matches"]
                if not m.get("matchStarted", False)
            ]
            upcoming.sort(key=lambda x: x.get("dateTimeGMT", x.get("date", "")))
            return upcoming[:5]

    tm = _team_map()
    upcoming = [m for m in SCHEDULE if m["status"] == "upcoming" and "type" not in m]
    enriched = []
    for m in upcoming[:5]:
        match = {**m}
        match["team1Info"] = _team_brief(tm.get(m["team1"]))
        match["team2Info"] = _team_brief(tm.get(m["team2"]))
        enriched.append(match)
    return enriched


@app.get("/api/matches/{match_id}")
def get_match_detail(match_id: str):
    """Get detailed info for a specific match by CricketData.org match ID"""
    if not cricket_api.enabled:
        raise HTTPException(400, "Live data is not enabled")
    info = cricket_api.get_match_info(match_id)
    if not info:
        raise HTTPException(502, "Could not fetch match details")
    return {"source": "live", "data": info}


@app.get("/api/matches/{match_id}/scorecard")
def get_match_scorecard(match_id: str):
    """Get scorecard for a match (may require paid plan)"""
    if not cricket_api.enabled:
        raise HTTPException(400, "Live data is not enabled")
    sc = cricket_api.get_match_scorecard(match_id)
    if not sc:
        raise HTTPException(502, "Could not fetch scorecard (may require paid plan)")
    return {"source": "live", "data": sc}


# ─── Players (NEW) ───
@app.get("/api/players/search")
def search_players(q: str = ""):
    """Search for players by name"""
    if not q:
        raise HTTPException(400, "Query parameter 'q' is required")
    if not cricket_api.enabled:
        raise HTTPException(400, "Live data is not enabled")
    players = cricket_api.search_players(q)
    if players is None:
        raise HTTPException(502, "Could not search players")
    return {"source": "live", "players": players}


@app.get("/api/players/{player_id}")
def get_player_detail(player_id: str):
    """Get detailed player information"""
    if not cricket_api.enabled:
        raise HTTPException(400, "Live data is not enabled")
    info = cricket_api.get_player_info(player_id)
    if not info:
        raise HTTPException(502, "Could not fetch player info")
    return {"source": "live", "data": info}


# ─── Points Table ───
def _parse_score(score_str: str):
    """Parse 'R/W (O)' format. Returns (runs, wickets, overs_float) or None."""
    if not score_str:
        return None
    m = re.match(r"(\d+)/(\d+)\s*\((\d+(?:\.\d+)?)\)", score_str)
    if not m:
        return None
    runs = int(m.group(1))
    wickets = int(m.group(2))
    overs_raw = float(m.group(3))
    # Convert overs (e.g. 15.4 means 15 overs + 4 balls = 15 + 4/6)
    whole = int(overs_raw)
    balls = round((overs_raw - whole) * 10)
    overs = whole + balls / 6.0
    return runs, wickets, overs


def _determine_winner(match: dict) -> str:
    """Return 'team1', 'team2', 'tie', 'no_result', or 'unknown'."""
    result = (match.get("result") or match.get("statusText") or "").lower()
    if "no result" in result or "abandoned" in result:
        return "no_result"
    if "tie" in result and "super over" not in result:
        return "tie"

    # Try to find which team name appears in the result with "won"
    t1_info = match.get("team1Info") or {}
    t2_info = match.get("team2Info") or {}
    t1_names = [
        (t1_info.get("name") or "").lower(),
        (t1_info.get("shortName") or "").lower(),
        match.get("team1", "").lower(),
    ]
    t2_names = [
        (t2_info.get("name") or "").lower(),
        (t2_info.get("shortName") or "").lower(),
        match.get("team2", "").lower(),
    ]

    if "won" in result:
        for n in t1_names:
            if n and n in result:
                return "team1"
        for n in t2_names:
            if n and n in result:
                return "team2"

    return "unknown"


def _calculate_points_table(matches: list) -> list:
    """Calculate points table from completed matches.
    Win=2pts, Tie/NoResult=1pt, Loss=0pts.
    NRR = (Runs Scored/Overs Faced) - (Runs Conceded/Overs Bowled)
    """
    team_ids = {t["id"] for t in TEAMS}
    stats = {}
    for tid in team_ids:
        stats[tid] = {
            "played": 0,
            "won": 0,
            "lost": 0,
            "tied": 0,
            "no_result": 0,
            "runs_scored": 0,
            "overs_faced": 0.0,
            "runs_conceded": 0,
            "overs_bowled": 0.0,
        }

    completed = [m for m in matches if m.get("status") == "completed"]

    for match in completed:
        t1_id = _SHORTNAME_TO_ID.get(
            match.get("team1", "").upper(), match.get("team1", "")
        )
        t2_id = _SHORTNAME_TO_ID.get(
            match.get("team2", "").upper(), match.get("team2", "")
        )

        if t1_id not in stats or t2_id not in stats:
            continue

        stats[t1_id]["played"] += 1
        stats[t2_id]["played"] += 1

        winner = _determine_winner(match)

        if winner == "team1":
            stats[t1_id]["won"] += 1
            stats[t2_id]["lost"] += 1
        elif winner == "team2":
            stats[t2_id]["won"] += 1
            stats[t1_id]["lost"] += 1
        elif winner == "tie":
            stats[t1_id]["tied"] += 1
            stats[t2_id]["tied"] += 1
        elif winner == "no_result":
            stats[t1_id]["no_result"] += 1
            stats[t2_id]["no_result"] += 1

        # Parse scores for NRR
        t1_parsed = _parse_score(match.get("team1Score"))
        t2_parsed = _parse_score(match.get("team2Score"))

        if t1_parsed and t2_parsed:
            t1_runs, _, t1_overs = t1_parsed
            t2_runs, _, t2_overs = t2_parsed

            stats[t1_id]["runs_scored"] += t1_runs
            stats[t1_id]["overs_faced"] += t1_overs
            stats[t1_id]["runs_conceded"] += t2_runs
            stats[t1_id]["overs_bowled"] += t2_overs

            stats[t2_id]["runs_scored"] += t2_runs
            stats[t2_id]["overs_faced"] += t2_overs
            stats[t2_id]["runs_conceded"] += t1_runs
            stats[t2_id]["overs_bowled"] += t1_overs

    result = []
    for tid, s in stats.items():
        points = s["won"] * 2 + s["tied"] * 1 + s["no_result"] * 1
        if s["overs_faced"] > 0 and s["overs_bowled"] > 0:
            nrr = (s["runs_scored"] / s["overs_faced"]) - (
                s["runs_conceded"] / s["overs_bowled"]
            )
        else:
            nrr = 0.0

        result.append(
            {
                "teamId": tid,
                "played": s["played"],
                "won": s["won"],
                "lost": s["lost"],
                "tied": s["tied"],
                "noResult": s["no_result"],
                "nrr": round(nrr, 3),
                "points": points,
            }
        )

    # Sort: by points desc, then NRR desc, then wins desc
    result.sort(key=lambda x: (-x["points"], -x["nrr"], -x["won"]))
    return result


@app.get("/api/points-table")
def get_points_table():
    # Get all matches (live API or static)
    all_matches = get_matches()  # Reuse the /api/matches logic

    table = _calculate_points_table(all_matches)

    tm = _team_map()
    enriched = []
    for pt in table:
        team = tm.get(pt["teamId"])
        if not team:
            continue
        # Enrich with API logo if available
        logo = team["logo"]
        if cricket_api.enabled:
            ipl_data = cricket_api.get_ipl_data()
            if ipl_data and ipl_data.get("teams"):
                api_teams = {at["shortName"].upper(): at for at in ipl_data["teams"]}
                sn = team["shortName"].upper()
                api_t = api_teams.get(sn)
                if not api_t:
                    for alias in _ID_TO_API_SHORTNAMES.get(team["id"], []):
                        api_t = api_teams.get(alias)
                        if api_t:
                            break
                if api_t and api_t.get("img"):
                    logo = api_t["img"]

        enriched.append(
            {
                **pt,
                "teamName": team["name"],
                "shortName": team["shortName"],
                "color": team["color"],
                "logo": logo,
            }
        )
    return enriched


# ─── Playoffs ───
@app.get("/api/playoffs")
def get_playoffs():
    tm = _team_map()
    playoffs = [m for m in SCHEDULE if "type" in m]
    enriched = []
    for m in playoffs:
        match = {**m}
        match["team1Info"] = _team_brief(tm.get(m["team1"]))
        match["team2Info"] = _team_brief(tm.get(m["team2"]))
        enriched.append(match)
    return enriched


# ─── Members ───
@app.get("/api/members")
def get_members():
    tm = _team_map()
    members = db.get_all_members()

    # Enrich with API logos
    api_logo_map = {}
    if cricket_api.enabled:
        ipl_data = cricket_api.get_ipl_data()
        if ipl_data and ipl_data.get("teams"):
            api_teams = {at["shortName"].upper(): at for at in ipl_data["teams"]}
            for t in TEAMS:
                sn = t["shortName"].upper()
                api_t = api_teams.get(sn)
                if not api_t:
                    for alias in _ID_TO_API_SHORTNAMES.get(t["id"], []):
                        api_t = api_teams.get(alias)
                        if api_t:
                            break
                if api_t and api_t.get("img"):
                    api_logo_map[t["id"]] = api_t["img"]

    result = []
    for m in members:
        member = {**m}
        member["topTeamsInfo"] = []
        for tid in m.get("topTeams", []):
            team = tm.get(tid)
            if team:
                logo = api_logo_map.get(tid, team["logo"])
                member["topTeamsInfo"].append(
                    {
                        "id": team["id"],
                        "shortName": team["shortName"],
                        "name": team["name"],
                        "color": team["color"],
                        "logo": logo,
                    }
                )
        result.append(member)
    return result


@app.post("/api/members")
def create_member_endpoint(member: MemberCreate):
    valid_team_ids = {t["id"] for t in TEAMS}
    for tid in member.topTeams:
        if tid not in valid_team_ids:
            raise HTTPException(400, f"Invalid team id: {tid}")
    if len(member.topTeams) > 4:
        raise HTTPException(400, "Maximum 4 teams allowed")

    new_member = db.create_member(
        name=member.name,
        avatar=member.avatar,
        top_teams=member.topTeams[:4],
    )
    return new_member


@app.put("/api/members/{member_id}")
def update_member_endpoint(
    member_id: int, member: MemberUpdate, x_admin_token: str = Header("")
):
    _verify_admin(x_admin_token)
    valid_top_teams = None
    if member.topTeams is not None:
        valid_team_ids = {t["id"] for t in TEAMS}
        for tid in member.topTeams:
            if tid not in valid_team_ids:
                raise HTTPException(400, f"Invalid team id: {tid}")
        if len(member.topTeams) > 4:
            raise HTTPException(400, "Maximum 4 teams allowed")
        valid_top_teams = member.topTeams[:4]

    updated = db.update_member(
        member_id=member_id,
        name=member.name,
        avatar=member.avatar,
        top_teams=valid_top_teams,
    )
    if not updated:
        raise HTTPException(404, "Member not found")
    return updated


@app.delete("/api/members/{member_id}")
def delete_member_endpoint(member_id: int, x_admin_token: str = Header("")):
    _verify_admin(x_admin_token)
    if db.delete_member(member_id):
        return {"message": "Member deleted"}
    raise HTTPException(404, "Member not found")


# ─── Cache Management ───
@app.post("/api/cache/invalidate")
def invalidate_cache(prefix: str = ""):
    """Invalidate API cache (useful for forcing fresh data)."""
    cricket_api.invalidate_cache(prefix)
    return {
        "message": f"Cache invalidated{' (prefix: ' + prefix + ')' if prefix else ''}"
    }
