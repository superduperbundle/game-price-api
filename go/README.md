# Go client: SuperDuperBundle Game Price API

```sh
go get github.com/superduperbundle/game-price-api/go
```

```go
import gameprices "github.com/superduperbundle/game-price-api/go"

c := gameprices.New()
g, err := c.Lookup(ctx, "Elden Ring")
if err == nil && g != nil && g.Lowest != nil {
	fmt.Printf("%s: $%.2f at %s (%s)\n", g.Name, g.Lowest.Price, g.Lowest.StoreName, g.URL)
}
games, _ := c.BySteamIDs(ctx, 1245620, 1091500) // up to 50 per request
```

Lowest listed PC key prices in US dollars across the official stores and key stores [SuperDuperBundle](https://superduperbundle.com/) compares. No key needed; a [free key](https://superduperbundle.com/tools/api/#keys) raises the rate limit (`c.APIKey`). Docs and terms: https://superduperbundle.com/tools/api/

Code: MIT (see the repository LICENSE). When you show a price, link it to the game's `URL` (attribution required by the API terms).
