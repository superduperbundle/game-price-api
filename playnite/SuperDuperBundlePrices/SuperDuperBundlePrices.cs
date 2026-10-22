// SuperDuperBundle Game Prices for Playnite: right-click a game -> "Check key prices on SuperDuperBundle".
// Sends only the selected games' Steam app IDs (Steam library games) or names to the free public API
// (https://superduperbundle.com/tools/api/) and shows the lowest listed PC key price, the store and how many
// stores were compared. "Yes" opens the full comparison in the browser. No account, no settings, nothing stored.
using Playnite.SDK;
using Playnite.SDK.Data;
using Playnite.SDK.Models;
using Playnite.SDK.Plugins;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Windows;

namespace SuperDuperBundlePrices
{
    public class Lowest
    {
        [SerializationPropertyName("price")] public double Price { get; set; }
        [SerializationPropertyName("store_name")] public string StoreName { get; set; }
        [SerializationPropertyName("checked_at")] public string CheckedAt { get; set; }
    }

    public class ApiGame
    {
        [SerializationPropertyName("id")] public string Id { get; set; }
        [SerializationPropertyName("name")] public string Name { get; set; }
        [SerializationPropertyName("url")] public string Url { get; set; }
        [SerializationPropertyName("state")] public string State { get; set; }
        [SerializationPropertyName("store_count")] public int StoreCount { get; set; }
        [SerializationPropertyName("steam_app_id")] public long? SteamAppId { get; set; }
        [SerializationPropertyName("lowest")] public Lowest Lowest { get; set; }
    }

    public class ApiAnswer
    {
        [SerializationPropertyName("results")] public List<ApiGame> Results { get; set; }
    }

    public class SuperDuperBundlePrices : GenericPlugin
    {
        private const string Api = "https://superduperbundle.com/api/v1/lookup/";
        private const int MaxGames = 50;
        private static readonly Guid SteamLibrary = Guid.Parse("CB91DFC9-B977-43BF-8E70-55F46E410FAB");
        private static readonly HttpClient Http = MakeClient();
        private static readonly ILogger Log = LogManager.GetLogger();

        public override Guid Id { get; } = Guid.Parse("0988dd81-b79c-4114-a19e-ba540bc21d7c");

        public SuperDuperBundlePrices(IPlayniteAPI api) : base(api)
        {
            Properties = new GenericPluginProperties { HasSettings = false };
        }

        private static HttpClient MakeClient()
        {
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
            var c = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            c.DefaultRequestHeaders.UserAgent.ParseAdd("SuperDuperBundle-Playnite/1.0 (+https://superduperbundle.com/tools/playnite/)");
            c.DefaultRequestHeaders.Accept.ParseAdd("application/json");
            return c;
        }

        public override IEnumerable<GameMenuItem> GetGameMenuItems(GetGameMenuItemsArgs args)
        {
            yield return new GameMenuItem
            {
                Description = "Check key prices on SuperDuperBundle",
                Action = a => Check(a.Games)
            };
        }

        private static string SteamId(Game g) =>
            g.PluginId == SteamLibrary && !string.IsNullOrEmpty(g.GameId) && g.GameId.All(char.IsDigit) ? g.GameId : null;

        private static ApiAnswer Get(string query)
        {
            var res = Http.GetAsync(Api + "?" + query + "&client=playnite").GetAwaiter().GetResult();
            if ((int)res.StatusCode == 429) throw new Exception("SuperDuperBundle's rate limit was reached. Try again in a minute.");
            if (!res.IsSuccessStatusCode) return null;
            return Serialization.FromJson<ApiAnswer>(res.Content.ReadAsStringAsync().GetAwaiter().GetResult());
        }

        // One result per selected game (null = not found), in the order of the selection.
        private static List<KeyValuePair<Game, ApiGame>> Lookup(List<Game> games, GlobalProgressActionArgs p)
        {
            var found = new Dictionary<Game, ApiGame>();
            var bySteam = games.Where(g => SteamId(g) != null).ToList();
            for (int i = 0; i < bySteam.Count && !p.CancelToken.IsCancellationRequested; i += 50)
            {
                var part = bySteam.Skip(i).Take(50).ToList();
                var answer = Get("steam_ids=" + string.Join(",", part.Select(SteamId).Distinct()));
                var map = (answer?.Results ?? new List<ApiGame>()).Where(r => r.SteamAppId != null)
                    .GroupBy(r => r.SteamAppId.Value.ToString(CultureInfo.InvariantCulture)).ToDictionary(x => x.Key, x => x.First());
                foreach (var g in part) if (map.TryGetValue(SteamId(g), out var r)) found[g] = r;
            }
            // Steam games the ID did not find, and every other game: by name (one request each).
            foreach (var g in games.Where(g => !found.ContainsKey(g)))
            {
                if (p.CancelToken.IsCancellationRequested) break;
                var name = (g.Name ?? "").Trim();
                if (name.Length < 2) continue;
                p.Text = "Checking " + name;
                var answer = Get("q=" + Uri.EscapeDataString(name.Length > 80 ? name.Substring(0, 80) : name) + "&limit=1");
                var r = answer?.Results?.FirstOrDefault();
                if (r != null) found[g] = r;
            }
            return games.Select(g => new KeyValuePair<Game, ApiGame>(g, found.TryGetValue(g, out var r) ? r : null)).ToList();
        }

        private static string Line(Game g, ApiGame r)
        {
            if (r == null) return g.Name + ": not found";
            var name = string.Equals(r.Name, g.Name, StringComparison.OrdinalIgnoreCase) ? r.Name : r.Name + " (for \"" + g.Name + "\")";
            if (r.State == "price" && r.Lowest != null)
            {
                var s = name + ": " + r.Lowest.Price.ToString("C2", CultureInfo.GetCultureInfo("en-US")) + " at " + r.Lowest.StoreName;
                if (r.StoreCount >= 2) s += ", lowest of " + r.StoreCount + " stores";
                if (DateTime.TryParse(r.Lowest.CheckedAt, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var d))
                    s += " (checked " + d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + ")";
                return s;
            }
            if (r.State == "free") return name + ": free to play";
            if (r.State == "unreleased") return name + ": not released yet";
            return name + ": not on sale at the stores SuperDuperBundle compares";
        }

        private void Check(List<Game> selection)
        {
            var games = selection.Take(MaxGames).ToList();
            List<KeyValuePair<Game, ApiGame>> results = null;
            string error = null;
            PlayniteApi.Dialogs.ActivateGlobalProgress(p =>
            {
                try { results = Lookup(games, p); }
                catch (Exception e) { Log.Error(e, "SuperDuperBundle lookup failed"); error = e.Message; }
            }, new GlobalProgressOptions("Checking key prices on SuperDuperBundle", true) { IsIndeterminate = true });

            if (error != null) { PlayniteApi.Dialogs.ShowErrorMessage("Could not reach SuperDuperBundle: " + error, "SuperDuperBundle"); return; }
            if (results == null) return;

            var links = results.Where(x => x.Value != null && !string.IsNullOrEmpty(x.Value.Url)).Select(x => x.Value.Url).ToList();
            var text = string.Join("\n", results.Select(x => Line(x.Key, x.Value)));
            if (selection.Count > MaxGames) text += "\n\nOnly the first " + MaxGames + " selected games were checked.";
            text += "\n\nListed prices in US dollars for PC keys; stores set fees and the final total at checkout.";
            if (links.Count == 0) { PlayniteApi.Dialogs.ShowMessage(text, "SuperDuperBundle"); return; }

            var open = links.Count == 1 ? "Open the full price comparison?" : "Open the price comparisons (first " + Math.Min(5, links.Count) + ")?";
            var answerBox = PlayniteApi.Dialogs.ShowMessage(text + "\n\n" + open, "SuperDuperBundle", MessageBoxButton.YesNo, MessageBoxImage.Information);
            if (answerBox != MessageBoxResult.Yes) return;
            foreach (var url in links.Take(5))
            {
                if (!url.StartsWith("https://superduperbundle.com/", StringComparison.Ordinal)) continue;
                try { Process.Start(url); } catch (Exception e) { Log.Error(e, "Could not open " + url); }
            }
        }
    }
}
