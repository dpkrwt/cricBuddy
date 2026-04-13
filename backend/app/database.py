"""PostgreSQL database module for members storage."""
import os
import json
import hashlib
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
    """Create the members and admin tables if they don't exist."""
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
            cur.execute("""
                CREATE TABLE IF NOT EXISTS admin (
                    id SERIAL PRIMARY KEY,
                    password_hash TEXT NOT NULL
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


# ── Admin password helpers ──

def _hash_password(password: str) -> str:
    """Hash a password with SHA-256 + salt."""
    salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return salt.hex() + ":" + hashed.hex()


def _verify_password(password: str, stored: str) -> bool:
    """Verify a password against a stored hash."""
    salt_hex, hash_hex = stored.split(":")
    salt = bytes.fromhex(salt_hex)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100_000)
    return hashed.hex() == hash_hex


def seed_admin(default_password: str):
    """Seed a default admin password if none exists."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM admin")
            if cur.fetchone()[0] > 0:
                return
            cur.execute(
                "INSERT INTO admin (password_hash) VALUES (%s)",
                (_hash_password(default_password),),
            )
        conn.commit()
        logger.info("Default admin password seeded")
    finally:
        conn.close()


def verify_admin_password(password: str) -> bool:
    """Check password against the stored admin hash."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT password_hash FROM admin ORDER BY id LIMIT 1")
            row = cur.fetchone()
            if not row:
                return False
            return _verify_password(password, row[0])
    finally:
        conn.close()


def update_admin_password(new_password: str):
    """Update the admin password."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE admin SET password_hash = %s WHERE id = (SELECT id FROM admin ORDER BY id LIMIT 1)",
                (_hash_password(new_password),),
            )
        conn.commit()
    finally:
        conn.close()
