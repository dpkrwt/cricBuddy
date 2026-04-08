"""
Cricket API integration for live data from CricketData.org (formerly CricAPI)
Free tier: https://cricketdata.org/member.aspx

Workflow:
  1. Search for latest IPL series via /series_search
  2. Fetch series details (match list) via /series_info
  3. Fetch individual match details via /match_info
  4. Fetch live scores via /currentMatches
  All responses are cached in-memory with configurable TTL.
"""

import os
import time
import requests
from typing import List, Dict, Any, Optional
from pathlib import Path


# ── Simple .env loader ──────────────────────────────────────────
def load_env():
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key.strip(), value.strip())


load_env()

API_KEY = os.getenv("CRICKET_API_KEY", "")
BASE_URL = os.getenv("CRICKET_API_BASE_URL", "https://api.cricapi.com/v1")
USE_LIVE_DATA = os.getenv("USE_LIVE_DATA", "false").lower() == "true"

# Cache TTLs (seconds)
SERIES_CACHE_TTL = 60 * 60 * 24      # 24 h – series data rarely changes
MATCHES_CACHE_TTL = 60 * 60 * 6      # 6 h  – match list within a series
MATCH_INFO_CACHE_TTL = 60 * 5        # 5 min – individual match details
LIVE_CACHE_TTL = 30                   # 30 s  – live scores


# ── TTL cache helper ────────────────────────────────────────────
class _Cache:
    """Minimal in-memory TTL cache (key → (value, expiry_ts))."""

    def __init__(self):
        self._store: Dict[str, tuple] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry and entry[1] > time.time():
            return entry[0]
        return None

    def set(self, key: str, value: Any, ttl: int):
        self._store[key] = (value, time.time() + ttl)

    def invalidate(self, prefix: str = ""):
        if not prefix:
            self._store.clear()
        else:
            self._store = {
                k: v for k, v in self._store.items() if not k.startswith(prefix)
            }


_cache = _Cache()


# ── Main API wrapper ────────────────────────────────────────────
class CricketAPI:
    """Full-featured wrapper for CricketData.org v1 API focused on IPL."""

    SERIES_SEARCH = "Indian Premier League"

    def __init__(self):
        self.api_key = API_KEY
        self.base_url = BASE_URL
        self.enabled = USE_LIVE_DATA and bool(API_KEY)

    # ── low-level request helper ─────────────────────────────
    def _get(self, endpoint: str, params: Optional[Dict] = None, timeout: float = 10.0) -> Optional[Dict]:
        """Make a GET request; returns parsed JSON or None on error."""
        if not self.enabled:
            return None
        url = f"{self.base_url}/{endpoint}"
        req_params = {"apikey": self.api_key}
        if params:
            req_params.update(params)
        try:
            resp = requests.get(url, params=req_params, timeout=timeout)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    return data
            print(f"[CricketAPI] {endpoint} returned non-success: {resp.status_code}")
            return None
        except Exception as exc:
            print(f"[CricketAPI] {endpoint} error: {exc}")
            return None

    # ── paginated fetch helper ───────────────────────────────
    def _get_all_pages(self, endpoint: str, params: Optional[Dict] = None, timeout: float = 10.0) -> Optional[List[Dict]]:
        """Fetch all pages of a paginated list endpoint."""
        if not self.enabled:
            return None
        all_items: List[Dict] = []
        offset = 0
        while True:
            p = dict(params or {})
            p["offset"] = offset
            data = self._get(endpoint, params=p, timeout=timeout)
            if not data:
                break
            items = data.get("data") or []
            all_items.extend(items)
            total_rows = (data.get("info") or {}).get("totalRows", 0)
            offset += len(items)
            if offset >= total_rows or not items:
                break
        return all_items or None

    # ──────────────────────────────────────────────────────────
    # 1. SERIES
    # ──────────────────────────────────────────────────────────
    def search_series(self, query: str = SERIES_SEARCH) -> Optional[List[Dict[str, Any]]]:
        """Search for a cricket series by name. Returns list of matching series."""
        cache_key = f"series_search:{query}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._get("series", {"search": query})
        if not data:
            return None
        result = data.get("data", [])
        _cache.set(cache_key, result, SERIES_CACHE_TTL)
        return result

    def get_latest_ipl_series(self) -> Optional[Dict[str, Any]]:
        """Find the latest (most recent) IPL series that has actual matches."""
        cache_key = "latest_ipl_series"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        series_list = self.search_series(self.SERIES_SEARCH)
        if not series_list:
            return None

        # Filter for IPL specifically
        ipl_series = [
            s for s in series_list
            if "indian premier league" in s.get("name", "").lower()
        ]
        if not ipl_series:
            return None

        # Prefer series that have actual matches (matches > 0)
        with_matches = [s for s in ipl_series if s.get("matches", 0) > 0]
        candidates = with_matches if with_matches else ipl_series

        # Sort by startDate descending; only consider full ISO dates (YYYY-MM-DD)
        dated = [s for s in candidates if len(s.get("startDate", "")) >= 10]
        if dated:
            latest = sorted(dated, key=lambda s: s["startDate"], reverse=True)[0]
        else:
            latest = candidates[0]

        _cache.set(cache_key, latest, SERIES_CACHE_TTL)
        return latest

    # ──────────────────────────────────────────────────────────
    # 2. SERIES INFO (match list for a series)
    # ──────────────────────────────────────────────────────────
    def get_series_info(self, series_id: str) -> Optional[Dict[str, Any]]:
        """Get full series info including match list."""
        cache_key = f"series_info:{series_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._get("series_info", {"id": series_id})
        if not data:
            return None
        result = data.get("data", {})
        _cache.set(cache_key, result, MATCHES_CACHE_TTL)
        return result

    def get_series_matches(self, series_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get all matches for a given series."""
        series_info = self.get_series_info(series_id)
        if not series_info:
            return None
        return series_info.get("matchList") or series_info.get("matches") or []

    # ──────────────────────────────────────────────────────────
    # 3. MATCH DETAILS
    # ──────────────────────────────────────────────────────────
    def get_match_info(self, match_id: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed match information for a specific match."""
        cache_key = f"match_info:{match_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._get("match_info", {"id": match_id})
        if not data:
            return None
        result = data.get("data", {})

        # Use shorter TTL for ongoing/live matches
        match_status = result.get("status", "").lower() if result else ""
        ttl = LIVE_CACHE_TTL if "progress" in match_status or "live" in match_status else MATCH_INFO_CACHE_TTL
        _cache.set(cache_key, result, ttl)
        return result

    def get_match_scorecard(self, match_id: str) -> Optional[Dict[str, Any]]:
        """Fetch match scorecard (may require paid plan)."""
        cache_key = f"match_scorecard:{match_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._get("match_scorecard", {"id": match_id})
        if not data:
            return None
        result = data.get("data", {})
        _cache.set(cache_key, result, MATCH_INFO_CACHE_TTL)
        return result

    # ──────────────────────────────────────────────────────────
    # 4. LIVE / CURRENT MATCHES
    # ──────────────────────────────────────────────────────────
    def get_current_matches(self) -> Optional[List[Dict[str, Any]]]:
        """Fetch currently running matches, filtered for IPL."""
        cache_key = "current_matches"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._get("currentMatches", {"offset": 0})
        if not data:
            return None
        matches = data.get("data") or []

        # Filter for IPL matches
        ipl_matches = [
            m for m in matches
            if _is_ipl_match(m)
        ]
        _cache.set(cache_key, ipl_matches, LIVE_CACHE_TTL)
        return ipl_matches

    # ──────────────────────────────────────────────────────────
    # 5. PLAYERS
    # ──────────────────────────────────────────────────────────
    def search_players(self, query: str) -> Optional[List[Dict[str, Any]]]:
        """Search for players by name."""
        cache_key = f"player_search:{query}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._get("players", {"search": query})
        if not data:
            return None
        result = data.get("data", [])
        _cache.set(cache_key, result, SERIES_CACHE_TTL)
        return result

    def get_player_info(self, player_id: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed player information."""
        cache_key = f"player_info:{player_id}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        data = self._get("players_info", {"id": player_id})
        if not data:
            return None
        result = data.get("data", {})
        _cache.set(cache_key, result, SERIES_CACHE_TTL)
        return result

    # ──────────────────────────────────────────────────────────
    # 6. HIGH-LEVEL: fetch everything for latest IPL
    # ──────────────────────────────────────────────────────────
    def get_ipl_data(self) -> Optional[Dict[str, Any]]:
        """
        One-shot fetch of latest IPL data:
        - series info
        - all matches (summary from series_info)
        - teams extracted from match list
        Returns a dict with keys: series, matches, teams
        """
        cache_key = "ipl_data"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        # Step 1: find latest IPL series
        series = self.get_latest_ipl_series()
        if not series:
            return None
        series_id = series.get("id")
        if not series_id:
            return None

        # Step 2: get series info (includes match list)
        series_info = self.get_series_info(series_id)
        if not series_info:
            return None

        match_list = series_info.get("matchList") or series_info.get("matches") or []

        # Step 3: extract teams from match list
        teams: Dict[str, Dict[str, Any]] = {}
        for match in match_list:
            for team_info in match.get("teamInfo") or []:
                tid = team_info.get("shortname", "").lower().replace(" ", "")
                if tid and tid not in teams:
                    teams[tid] = {
                        "id": tid,
                        "name": team_info.get("name", ""),
                        "shortName": team_info.get("shortname", ""),
                        "img": team_info.get("img", ""),
                    }

        result = {
            "series": series,
            "seriesInfo": series_info,
            "matches": match_list,
            "teams": list(teams.values()),
        }
        _cache.set(cache_key, result, MATCHES_CACHE_TTL)
        return result

    def invalidate_cache(self, prefix: str = ""):
        """Manually invalidate cache entries."""
        _cache.invalidate(prefix)


# ── Helpers ──────────────────────────────────────────────────────
def _is_ipl_match(match: Dict[str, Any]) -> bool:
    """Check if a match dict belongs to IPL."""
    series = (match.get("series") or match.get("name") or "").lower()
    match_type = (match.get("matchType") or "").lower()
    return (
        "indian premier league" in series
        or "ipl" in series
        or ("t20" in match_type and "ipl" in series)
    )


# Singleton instance
cricket_api = CricketAPI()
