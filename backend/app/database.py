"""PostgreSQL database module for members storage."""
import os
import json
import logging
import psycopg2
import psycopg2.extras

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://localhost:5432/cricbuddy"
)


def get_connection():
    """Get a new database connection."""
    return psycopg2.connect(DATABASE_URL)


def init_db():
    """Create the members table if it doesn't exist."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS members (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    avatar TEXT NOT NULL DEFAULT '🏏',
                    top_teams JSONB NOT NULL DEFAULT '[]'::jsonb
                )
            """)
        conn.commit()
        logger.info("Database initialized")
    finally:
        conn.close()


def seed_members(default_members: list):
    """Seed default members if the table is empty."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM members")
            count = cur.fetchone()[0]
            if count > 0:
                return

            logger.info("Seeding default members into PostgreSQL")
            for m in default_members:
                cur.execute(
                    "INSERT INTO members (id, name, avatar, top_teams) VALUES (%s, %s, %s, %s)",
                    (m["id"], m["name"], m["avatar"], json.dumps(m.get("topTeams", []))),
                )
            # Reset the sequence to be after the max id
            cur.execute("SELECT setval('members_id_seq', (SELECT COALESCE(MAX(id), 0) FROM members))")
        conn.commit()
    finally:
        conn.close()


def get_all_members() -> list:
    """Get all members."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name, avatar, top_teams FROM members ORDER BY id")
            rows = cur.fetchall()
            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "avatar": row["avatar"],
                    "topTeams": row["top_teams"],
                }
                for row in rows
            ]
    finally:
        conn.close()


def get_member(member_id: int) -> dict | None:
    """Get a single member by ID."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, avatar, top_teams FROM members WHERE id = %s",
                (member_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "name": row["name"],
                "avatar": row["avatar"],
                "topTeams": row["top_teams"],
            }
    finally:
        conn.close()


def create_member(name: str, avatar: str, top_teams: list) -> dict:
    """Create a new member and return it."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO members (name, avatar, top_teams) VALUES (%s, %s, %s) RETURNING id, name, avatar, top_teams",
                (name, avatar, json.dumps(top_teams)),
            )
            row = cur.fetchone()
        conn.commit()
        return {
            "id": row["id"],
            "name": row["name"],
            "avatar": row["avatar"],
            "topTeams": row["top_teams"],
        }
    finally:
        conn.close()


def update_member(member_id: int, name: str | None, avatar: str | None, top_teams: list | None) -> dict | None:
    """Update an existing member. Returns updated member or None if not found."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Build dynamic SET clause
            parts = []
            params = []
            if name is not None:
                parts.append("name = %s")
                params.append(name)
            if avatar is not None:
                parts.append("avatar = %s")
                params.append(avatar)
            if top_teams is not None:
                parts.append("top_teams = %s")
                params.append(json.dumps(top_teams))

            if not parts:
                return get_member(member_id)

            params.append(member_id)
            cur.execute(
                f"UPDATE members SET {', '.join(parts)} WHERE id = %s RETURNING id, name, avatar, top_teams",
                params,
            )
            row = cur.fetchone()
            if not row:
                return None
        conn.commit()
        return {
            "id": row["id"],
            "name": row["name"],
            "avatar": row["avatar"],
            "topTeams": row["top_teams"],
        }
    finally:
        conn.close()


def delete_member(member_id: int) -> bool:
    """Delete a member. Returns True if deleted, False if not found."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM members WHERE id = %s", (member_id,))
            deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()
