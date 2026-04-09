/* api.js
   Strategy:
   - Players DB: loaded from /data/players.json (pre-fetched by GitHub Actions, no CORS)
   - League data: fetched live from Sleeper API via a lightweight fetch
     The Sleeper API does support CORS for /league/* endpoints.
     The /players/nfl endpoint does NOT reliably support CORS from browsers,
     which is why we pre-fetch it via GitHub Actions instead.
*/

const SleeperAPI = (() => {
  const BASE = 'https://api.sleeper.app/v1';

  async function get(path) {
    const url = BASE + path;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      throw new Error(`Sleeper API error: ${err.message}`);
    }
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
    getTrendingPlayers: (type = 'add', limit = 10) =>
      get(`/players/nfl/trending/${type}?lookback_hours=24&limit=${limit}`),
  };
})();

// ── Player DB – loaded from pre-fetched local file ────────────────
const PlayerDB = (() => {
  let _players = null;
  let _promise  = null;

  async function load(onProgress) {
    if (_players) return _players;
    if (_promise)  return _promise;

    _promise = (async () => {
      if (onProgress) onProgress('Loading player database...', 20);

      // Load from local pre-fetched file (no CORS issues!)
      const res = await fetch('./data/players.json');
      if (!res.ok) throw new Error('Player database not found. Please wait for GitHub Actions to complete the first deploy.');

      if (onProgress) onProgress('Processing player data...', 60);
      _players = await res.json();
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
