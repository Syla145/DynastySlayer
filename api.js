/* api.js – Sleeper API wrapper with multi-proxy CORS fallback */
const SleeperAPI = (() => {
  const BASE = 'https://api.sleeper.app/v1';

  // Multiple proxies tried in order until one works
  const PROXIES = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    url => `https://proxy.cors.sh/${url}`,
  ];

  async function get(path) {
    const directUrl = BASE + path;

    // 1) Try direct first
    try {
      const res = await fetch(directUrl, { method: 'GET', mode: 'cors' });
      if (res.ok) return res.json();
    } catch (_) {}

    // 2) Try each proxy in order
    for (const makeProxy of PROXIES) {
      try {
        const res = await fetch(makeProxy(directUrl), { method: 'GET' });
        if (res.ok) {
          const text = await res.text();
          return JSON.parse(text);
        }
      } catch (_) {}
    }

    throw new Error('Cannot reach Sleeper API. Check your League ID and try again.');
  }

  return {
    getLeague:      id  => get(`/league/${id}`),
    getRosters:     id  => get(`/league/${id}/rosters`),
    getUsers:       id  => get(`/league/${id}/users`),
    getMatchups:    (id, week) => get(`/league/${id}/matchups/${week}`),
    getDraftPicks:  id  => get(`/league/${id}/traded_picks`),
    getDrafts:      id  => get(`/league/${id}/drafts`),
    getDraft:       did => get(`/draft/${did}`),
    getDraftPicks2: did => get(`/draft/${did}/picks`),
    getPlayers:     ()  => get('/players/nfl'),
    getTrendingPlayers: (type = 'add', limit = 10) =>
      get(`/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`),
  };
})();

// ── Player DB cache ──────────────────────────────────────────────
const PlayerDB = (() => {
  let _players = null;
  let _promise  = null;

  async function load(onProgress) {
    if (_players) return _players;
    if (_promise)  return _promise;

    _promise = (async () => {
      if (onProgress) onProgress('Fetching player database (~5MB, please wait)...', 20);
      const raw = await SleeperAPI.getPlayers();
      if (onProgress) onProgress('Processing player data...', 60);
      _players = raw;
      return _players;
    })();
    return _promise;
  }

  function get(id)  { return _players ? (_players[id] || null) : null; }
  function all()    { return _players || {}; }

  function search(query, limit = 20) {
    if (!_players) return [];
    const q = query.toLowerCase();
    return Object.values(_players)
      .filter(p => p.full_name && p.full_name.toLowerCase().includes(q) && p.active)
      .sort((a, b) => (b.search_rank || 9999) - (a.search_rank || 9999))
      .slice(0, limit);
  }

  return { load, get, all, search };
})();
