package gameprices

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

const sample = `{"api":"v1","count":1,"results":[{"id":"elden-ring","name":"ELDEN RING","steam_app_id":1245620,"url":"https://superduperbundle.com/game/elden-ring/","image":null,"state":"price","currency":"USD","list_price":59.99,"lowest":{"store":"gamebillet","store_name":"GameBillet","store_type":"retailer","price":52.89,"drm":"Steam","region":"US","checked_at":"2026-10-21T20:34:42Z","discount_pct":12},"lowest_steam_key":null,"store_count":8,"offer_count":8,"offers":[]}],"attribution":{"text":"Prices by SuperDuperBundle","url":"https://superduperbundle.com/"}}`

func TestLookup(t *testing.T) {
	var got string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.URL.RawQuery
		if r.Header.Get("X-API-Key") != "sdb_test" {
			t.Errorf("api key header missing")
		}
		w.Write([]byte(sample))
	}))
	defer srv.Close()
	c := New()
	c.BaseURL, c.APIKey, c.AppName = srv.URL, "sdb_test", "go-test"
	g, err := c.Lookup(context.Background(), "elden ring")
	if err != nil || g == nil {
		t.Fatalf("lookup: %v", err)
	}
	if g.Lowest.Price != 52.89 || g.StoreCount != 8 || *g.Lowest.DiscountPct != 12 {
		t.Fatalf("decoded %+v", g)
	}
	if got != "client=go-test&limit=1&q=elden+ring" {
		t.Fatalf("query %q", got)
	}
}

func TestError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Retry-After", "30")
		w.WriteHeader(429)
		w.Write([]byte(`{"error":{"code":"rate_limited","message":"slow down"}}`))
	}))
	defer srv.Close()
	c := New()
	c.BaseURL = srv.URL
	_, err := c.BySteamIDs(context.Background(), 1, 2)
	e, ok := err.(*Error)
	if !ok || e.Status != 429 || e.Code != "rate_limited" || e.RetryAfter != 30 {
		t.Fatalf("error %#v", err)
	}
	if _, err := c.BySteamIDs(context.Background()); err == nil {
		t.Fatal("empty batch must fail")
	}
}
