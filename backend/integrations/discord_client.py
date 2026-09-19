"""Minimal Discord bot REST API client.

Uses a bot token (Authorization: Bot <token>) against Discord's v10 REST API.
No OAuth redirect flow needed — the workspace admin creates a bot application
in the Discord Developer Portal, invites it to their server, and pastes the
bot token + server (guild) ID here.
"""
import requests

API_BASE = "https://discord.com/api/v10"
_TIMEOUT = 10


def _headers(bot_token: str) -> dict:
    return {"Authorization": f"Bot {bot_token}"}


def verify_guild_access(bot_token: str, guild_id: str) -> tuple[bool, str]:
    """Confirms the bot token is valid and the bot has access to the given guild.
    Returns (success, error_message)."""
    try:
        resp = requests.get(f"{API_BASE}/guilds/{guild_id}", headers=_headers(bot_token), timeout=_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        return False, f"Could not reach Discord: {exc}"

    if resp.status_code == 200:
        return True, ""
    if resp.status_code == 401:
        return False, "Invalid bot token."
    if resp.status_code == 403:
        return False, "Bot token is valid, but the bot is not a member of that server (invite it first)."
    if resp.status_code == 404:
        return False, "Server (guild) ID not found."
    return False, f"Discord API error {resp.status_code}: {resp.text[:200]}"


def list_channels(bot_token: str, guild_id: str) -> list[dict]:
    resp = requests.get(f"{API_BASE}/guilds/{guild_id}/channels", headers=_headers(bot_token), timeout=_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_recent_messages(bot_token: str, channel_id: str, limit: int = 50) -> list[dict]:
    resp = requests.get(
        f"{API_BASE}/channels/{channel_id}/messages",
        headers=_headers(bot_token),
        params={"limit": limit},
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def post_message(bot_token: str, channel_id: str, content: str) -> dict:
    resp = requests.post(
        f"{API_BASE}/channels/{channel_id}/messages",
        headers={**_headers(bot_token), "Content-Type": "application/json"},
        json={"content": content},
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()
