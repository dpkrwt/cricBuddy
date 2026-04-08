# CricBuddy 🏏

A full-stack cricket application for IPL T20 match tracking with member management and team selection.

## Features

- **Dashboard**: Live scores, upcoming matches, and members leaderboard
- **Matches**: Complete schedule, points table, and playoffs bracket
- **Teams**: Browse all IPL teams and their player squads
- **Members**: Add/edit members with drag-and-drop top 4 team selection (points: 40/30/20/10)

## Tech Stack

- **Frontend**: React + TypeScript + Chakra UI
- **Backend**: FastAPI + Python
- **Data Source**: Static data (default) or live data from CricketData.org API

## Setup

### 1. Install Dependencies

```bash
# Install all dependencies
make install

# Or manually:
cd backend && pip3 install -r requirements.txt
cd frontend && npm install
```

### 2. Configure Live Cricket Data (Optional)

To use live cricket match data:

1. Get a free API key from [CricketData.org](https://cricketdata.org/member.aspx)
2. Create `backend/.env` file:

```env
CRICKET_API_KEY=your_api_key_here
CRICKET_API_BASE_URL=https://api.cricapi.com/v1
USE_LIVE_DATA=true
```

Without an API key, the app uses static IPL 2025 mock data.

### 3. Run the Application

```bash
# Start both servers
make dev

# Or start individually:
make backend    # Runs on http://127.0.0.1:8000
make frontend   # Runs on http://localhost:3000
```

Visit **http://localhost:3000** in your browser.

## API Endpoints

- `GET /api/status` - API status and data source info
- `GET /api/teams` - All IPL teams
- `GET /api/teams/{id}` - Team details with players
- `GET /api/matches` - Full match schedule
- `GET /api/matches/live` - Live matches (uses API if enabled)
- `GET /api/matches/upcoming` - Next 5 upcoming matches
- `GET /api/points-table` - Current standings
- `GET /api/playoffs` - Playoff matches
- `GET /api/members` - All members
- `POST /api/members` - Create member
- `PUT /api/members/{id}` - Update member
- `DELETE /api/members/{id}` - Delete member

## Makefile Commands

```bash
make help      # Show all available commands
make install   # Install dependencies
make dev       # Run both frontend and backend
make backend   # Run backend only
make frontend  # Run frontend only
make build     # Build frontend for production
make clean     # Remove build artifacts
```

## Project Structure

```
cricBuddy/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app & endpoints
│   │   ├── data.py         # Static IPL data
│   │   ├── cricket_api.py  # CricketData.org API client
│   │   └── __init__.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/     # Navbar, MembersSection
│   │   ├── pages/          # Dashboard, Matches, Teams, TeamDetail
│   │   ├── api.ts          # Axios client
│   │   ├── types.ts        # TypeScript interfaces
│   │   ├── theme.ts        # Chakra UI theme
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── Makefile
```

## Data Sources

### Static Data (Default)
- 10 IPL teams with full player rosters
- 35+ matches with scores and schedules
- Points table
- Playoff brackets
- 3 default members: Parth, Ashu, Avilash

### Live Data (When API Key Configured)
- Real-time IPL match scores from [CricketData.org](https://cricketdata.org)
- Free tier: 100 requests/day
- Paid tiers available for higher limits

## Image Source

Team logos are generated using [UI Avatars](https://ui-avatars.com/) - a free avatar generation service that creates colored images from team initials using official team colors.

## Development Notes

- Frontend runs on port 3000, backend on port 8000
- Vite proxy configured: `/api` → `http://127.0.0.1:8000`
- TypeScript strict mode enabled
- Dark IPL-themed UI with Chakra UI v2

## License

MIT
