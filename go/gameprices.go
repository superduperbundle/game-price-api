// Package gameprices is the Go client for the SuperDuperBundle Game Price API
// (https://superduperbundle.com/tools/api/): the lowest listed PC game key price for a game,
// by name, Steam app ID or Steam store URL, with a link to the full comparison.
//
// No dependencies, no API key needed (a free key raises the rate limit). Code: MIT.
// Data: under the API terms (https://superduperbundle.com/tools/api/#terms): whenever you
// display a price, show a visible link to SuperDuperBundle (link it to the game's URL).
package gameprices

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// BaseURL is the API root. MaxBatch is the most Steam app IDs one request takes.
const (
	BaseURL  = "https://superduperbundle.com/api/v1"
	MaxBatch = 50
)

// Offer is one store's listed price for a game (US dollars).
type Offer struct {
	Store       string  `json:"store"`
	StoreName   string  `json:"store_name"`
	StoreType   string  `json:"store_type"`
	Price       float64 `json:"price"`
	DRM         *string `json:"drm"`
	Region      *string `json:"region"`
	CheckedAt   *string `json:"checked_at"`
	DiscountPct *int    `json:"discount_pct,omitempty"`
}

// Game is one game's answer. State is "price", "free", "unreleased" or "not_on_sale".
type Game struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	SteamAppID     *int     `json:"steam_app_id"`
	URL            string   `json:"url"`
	Image          *string  `json:"image"`
	State          string   `json:"state"`
	Currency       string   `json:"currency"`
	ListPrice      *float64 `json:"list_price"`
	Lowest         *Offer   `json:"lowest"`
	LowestSteamKey *Offer   `json:"lowest_steam_key"`
	StoreCount     int      `json:"store_count"`
	OfferCount     int      `json:"offer_count"`
	Offers         []Offer  `json:"offers"`
}

// Response is the API envelope.
type Response struct {
	API         string   `json:"api"`
	Count       int      `json:"count"`
	Results     []Game   `json:"results"`
	NotFound    []string `json:"not_found,omitempty"`
	Attribution struct {
		Text string `json:"text"`
		URL  string `json:"url"`
	} `json:"attribution"`
}

// Error is a non-2xx answer. RetryAfter is set (seconds) on 429.
type Error struct {
	Status     int
	Code       string
	Message    string
	RetryAfter int
}

func (e *Error) Error() string {
	return fmt.Sprintf("gameprices: %d %s: %s", e.Status, e.Code, e.Message)
}

// Client calls the API. Use New for the defaults.
type Client struct {
	BaseURL    string
	APIKey     string // optional free key (sdb_...)
	AppName    string // optional: tags compare links so we can see which tools send visitors
	HTTPClient *http.Client
}

// New returns a client with a 15-second timeout.
func New() *Client {
	return &Client{BaseURL: BaseURL, HTTPClient: &http.Client{Timeout: 15 * time.Second}}
}

func (c *Client) get(ctx context.Context, q url.Values) (*Response, error) {
	if c.AppName != "" {
		q.Set("client", c.AppName)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(c.BaseURL, "/")+"/lookup/?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if c.APIKey != "" {
		req.Header.Set("X-API-Key", c.APIKey)
	}
	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		var body struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(res.Body).Decode(&body)
		ra, _ := strconv.Atoi(res.Header.Get("Retry-After"))
		e := &Error{Status: res.StatusCode, Code: body.Error.Code, Message: body.Error.Message, RetryAfter: ra}
		if e.Code == "" {
			e.Code, e.Message = "http_error", res.Status
		}
		return nil, e
	}
	var out Response
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

// Search finds games by name (typos and nicknames such as "rdr2" are handled); limit 1-10.
func (c *Client) Search(ctx context.Context, name string, limit int) ([]Game, error) {
	if limit < 1 {
		limit = 1
	}
	r, err := c.get(ctx, url.Values{"q": {name}, "limit": {strconv.Itoa(limit)}})
	if err != nil {
		return nil, err
	}
	return r.Results, nil
}

// Lookup returns the best match for a name, or nil when nothing matched.
func (c *Client) Lookup(ctx context.Context, name string) (*Game, error) {
	g, err := c.Search(ctx, name, 1)
	if err != nil || len(g) == 0 {
		return nil, err
	}
	return &g[0], nil
}

// BySteamIDs looks up to MaxBatch Steam app IDs in one request (unknown IDs are left out).
func (c *Client) BySteamIDs(ctx context.Context, ids ...int) ([]Game, error) {
	if len(ids) == 0 || len(ids) > MaxBatch {
		return nil, fmt.Errorf("gameprices: pass 1-%d Steam app IDs", MaxBatch)
	}
	s := make([]string, len(ids))
	for i, id := range ids {
		s[i] = strconv.Itoa(id)
	}
	r, err := c.get(ctx, url.Values{"steam_ids": {strings.Join(s, ",")}})
	if err != nil {
		return nil, err
	}
	return r.Results, nil
}

// ByURL looks up a Steam store page (store.steampowered.com/app/...) or one of our game pages.
func (c *Client) ByURL(ctx context.Context, pageURL string) (*Game, error) {
	r, err := c.get(ctx, url.Values{"url": {pageURL}})
	if err != nil || len(r.Results) == 0 {
		return nil, err
	}
	return &r.Results[0], nil
}
