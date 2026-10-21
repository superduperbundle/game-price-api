"""Live smoke test (needs network): python test_client.py"""
import sys
sys.path.insert(0, "src")
from superduperbundle import GamePrices, ApiError, lookup  # noqa: E402

g = lookup("elden ring", client="ci-smoke")
assert g and g["steam_app_id"] == 1245620, g
assert g["url"].startswith("https://superduperbundle.com/game/")
c = GamePrices(client="ci-smoke")
many = c.by_steam_ids([1245620, 1091500, 292030])
assert [x["steam_app_id"] for x in many] == [1245620, 1091500, 292030]
assert c.rate_limit and c.rate_limit["limit"] >= 600 or c.rate_limit is None  # cache hits carry no limit headers
try:
    c.search("x")
    raise SystemExit("expected ApiError")
except ApiError as e:
    assert e.status == 400 and e.code == "query_too_short"
print("python client: ok |", g["name"], g["lowest"]["price"], g["lowest"]["store_name"])
