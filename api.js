/* api.js – Sleeper API wrapper */
const SleeperAPI = (() => {
  const BASE = 'https://api.sleeper.app/v1';

  async function get(path) {
    const res = await fetch(BASE + path);
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json();
  }

  return {
    getLeague:      id   => get(`/league/${id}`),
    getRosters:     id   => get(`/league/${id}/rosters`),
    getUsers:       id   => get(`/league/${id}/users`),
    getMatchups:    (id, week) => get(`/league/${id}/matchups/${week}`),
    getDraftPicks:  id   => get(`/league/${id}/traded_picks`),
    getDrafts:      id   => get(`/league/${id}/drafts`),
    getDraft:       did  => get(`/draft/${did}`),
    getDraftPicks2: did  => get(`/draft/${did}/picks`),
    getPlayers:     ()   => get('/players/nfl'),        // ~5 MB, cache it
    getTrendingPlayers: (type='add', limit=10) => get(`/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`),
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
      if (onProgress) onProgress('Fetching player database (this may take a moment)...', 20);
      const raw = await SleeperAPI.getPlayers();
      if (onProgress) onProgress('Processing player data...', 60);
      _players = raw;
      return _players;
    })();
    return _promise;
  }

  function get(id) { return _players ? (_players[id] || null) : null; }
  function all()   { return _players || {}; }
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
