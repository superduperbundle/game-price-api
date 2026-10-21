"""Client for the free SuperDuperBundle Game Price API (https://superduperbundle.com/tools/api/).

Lowest listed PC game key prices by name, Steam app ID or store URL. Standard library only (Python 3.9+).
Code: MIT. Data: under the API terms (https://superduperbundle.com/tools/api/#terms): whenever you display it,
show a visible link to SuperDuperBundle (link each price to the game's ``url``).

    >>> from superduperbundle import GamePrices
    >>> game = GamePrices(client="my-app").search("elden ring")["results"][0]
    >>> game["lowest"]["price"], game["lowest"]["store_name"], game["url"]
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional

__all__ = ["GamePrices", "ApiError", "lookup", "BASE_URL", "MAX_BATCH"]
__version__ = "1.0.0"

BASE_URL = "https://superduperbundle.com/api/v1"
MAX_BATCH = 50
Game = Dict[str, Any]


class ApiError(Exception):
    """An error answer from the API (``status``, ``code``, ``retry_after`` seconds or None)."""

    def __init__(self, status: int, code: str, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.status, self.code, self.retry_after = status, code, retry_after


class GamePrices:
    """API client. ``api_key``: free key from /tools/api/#keys (higher limits). ``client``: your app's name
    (lowercase letters, digits, hyphens), tags our compare links so we can see which tools send visitors."""

    def __init__(self, api_key: Optional[str] = None, client: Optional[str] = None, base_url: str = BASE_URL, timeout: float = 15.0):
        self.api_key, self.client, self.timeout = api_key, client, timeout
        self.base_url = base_url.rstrip("/")
        self.rate_limit: Optional[Dict[str, int]] = None

    def _get(self, params: Dict[str, str]) -> Dict[str, Any]:
        if self.client:
            params = {**params, "client": self.client}
        url = f"{self.base_url}/lookup/?{urllib.parse.urlencode(params)}"
        headers = {"Accept": "application/json", "User-Agent": f"superduperbundle-python/{__version__}"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as res:
                self._note_limits(res.headers)
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            self._note_limits(e.headers)
            try:
                err = json.loads(e.read().decode("utf-8")).get("error", {})
            except Exception:
                err = {}
            ra = e.headers.get("Retry-After") if e.headers else None
            raise ApiError(e.code, err.get("code", "http_error"), err.get("message", f"HTTP {e.code}"), int(ra) if ra and ra.isdigit() else None) from None

    def _note_limits(self, headers: Any) -> None:
        if headers and headers.get("X-RateLimit-Limit"):
            self.rate_limit = {k: int(headers.get(f"X-RateLimit-{k.title()}", 0)) for k in ("limit", "remaining", "reset")}

    def search(self, name: str, limit: int = 1) -> Dict[str, Any]:
        """Search by name; up to ``limit`` (1-5) games, best match first."""
        return self._get({"q": name, "limit": str(limit)})

    def by_steam_id(self, app_id: int) -> Optional[Game]:
        r = self._get({"steam_id": str(app_id)})["results"]
        return r[0] if r else None

    def by_steam_ids(self, app_ids: Iterable[int]) -> List[Game]:
        """Any number of Steam app IDs (sent in batches of 50). Results in the order asked; unknown IDs left out."""
        ids = [str(i) for i in app_ids]
        out: List[Game] = []
        for i in range(0, len(ids), MAX_BATCH):
            out.extend(self._get({"steam_ids": ",".join(ids[i:i + MAX_BATCH])})["results"])
        return out

    def by_slug(self, slug: str) -> Optional[Game]:
        r = self._get({"slug": slug})["results"]
        return r[0] if r else None

    def by_url(self, url: str) -> Optional[Game]:
        """A Steam store URL or one of our game page URLs."""
        r = self._get({"url": url})["results"]
        return r[0] if r else None


def lookup(name: str, **options: Any) -> Optional[Game]:
    """The best match for a name, or None."""
    r = GamePrices(**options).search(name, 1)["results"]
    return r[0] if r else None
