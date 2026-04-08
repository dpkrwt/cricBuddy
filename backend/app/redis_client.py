"""Minimal Redis client using raw sockets (no redis-py dependency)."""
import socket
import json
from typing import Optional, List


class RedisClient:
    def __init__(self, host: str = "localhost", port: int = 6379, timeout: float = 2.0):
        self.host = host
        self.port = port
        self.timeout = timeout

    def _send_command(self, *args: str) -> str:
        """Send a RESP command and return the response."""
        # Build RESP protocol message
        parts = [f"*{len(args)}\r\n"]
        for arg in args:
            encoded = str(arg)
            parts.append(f"${len(encoded.encode('utf-8'))}\r\n{encoded}\r\n")
        message = "".join(parts)

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        try:
            sock.connect((self.host, self.port))
            sock.sendall(message.encode("utf-8"))
            # Read response
            data = b""
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                data += chunk
                # Check if we have a complete response
                if self._is_complete_response(data):
                    break
            return data.decode("utf-8")
        finally:
            sock.close()

    def _is_complete_response(self, data: bytes) -> bool:
        """Check if we have a complete RESP response."""
        if not data:
            return False
        text = data.decode("utf-8", errors="replace")
        first = text[0]
        if first in ("+", "-", ":"):
            return text.endswith("\r\n")
        if first == "$":
            lines = text.split("\r\n")
            if len(lines) < 2:
                return False
            length = int(lines[0][1:])
            if length == -1:
                return True
            # $N\r\n<data>\r\n
            return len(data) >= len(lines[0].encode()) + 2 + length + 2
        if first == "*":
            # For arrays, be generous — check if we have enough \r\n
            lines = text.split("\r\n")
            count = int(lines[0][1:])
            if count <= 0:
                return True
            # Each element has 2 lines ($N and data), plus trailing \r\n
            expected_lines = 1 + count * 2 + 1  # header + pairs + trailing
            return len(lines) >= expected_lines
        return True

    def _parse_response(self, raw: str):
        """Parse a RESP response."""
        if not raw:
            return None
        first = raw[0]
        if first == "+":
            return raw[1:].strip()
        if first == "-":
            raise Exception(f"Redis error: {raw[1:].strip()}")
        if first == ":":
            return int(raw[1:].strip())
        if first == "$":
            lines = raw.split("\r\n")
            length = int(lines[0][1:])
            if length == -1:
                return None
            return lines[1]
        if first == "*":
            lines = raw.split("\r\n")
            count = int(lines[0][1:])
            if count <= 0:
                return []
            results = []
            idx = 1
            for _ in range(count):
                if idx >= len(lines):
                    break
                line = lines[idx]
                if line.startswith("$"):
                    length = int(line[1:])
                    idx += 1
                    if length == -1:
                        results.append(None)
                    else:
                        results.append(lines[idx] if idx < len(lines) else None)
                        idx += 1
                else:
                    idx += 1
            return results
        return raw.strip()

    def ping(self) -> bool:
        try:
            resp = self._send_command("PING")
            return "+PONG" in resp
        except Exception:
            return False

    def get(self, key: str) -> Optional[str]:
        raw = self._send_command("GET", key)
        return self._parse_response(raw)

    def set(self, key: str, value: str) -> bool:
        raw = self._send_command("SET", key, value)
        return "OK" in raw

    def delete(self, key: str) -> int:
        raw = self._send_command("DEL", key)
        return self._parse_response(raw)

    def keys(self, pattern: str = "*") -> List[str]:
        raw = self._send_command("KEYS", pattern)
        result = self._parse_response(raw)
        return result if isinstance(result, list) else []

    def incr(self, key: str) -> int:
        raw = self._send_command("INCR", key)
        return self._parse_response(raw)

    # ── JSON helpers ──
    def get_json(self, key: str):
        val = self.get(key)
        if val is None:
            return None
        return json.loads(val)

    def set_json(self, key: str, obj) -> bool:
        return self.set(key, json.dumps(obj))


# Singleton instance
redis = RedisClient(host="localhost", port=6379)
