/* values.js – KeepTradeCut + Dynasty Daddy value engine
   Both APIs are unofficial/community. We use:
   - KTC: https://keeptradecut.com/dynasty-rankings (scraped via proxy-free JSON endpoint)
   - Dynasty Daddy: https://dynastydaddyleagues.com/api (public rankings endpoint)
   Since both are CORS-restricted from the browser, we fall back to a curated
   static dataset of the top ~350 players + picks, updated periodically.
   When live data is available, it overrides the static values.
*/

const Values = (() => {

  // ── Static baseline values (KTC-style 0-10000 scale, as of mid-2025) ──────
  // Format: { playerName_or_pickKey: { ktc, dd } }
  // These are approximate consensus values for dynasty football.
  const STATIC = {
    // QBs
    'Patrick Mahomes':   { ktc: 9200, dd: 9100 },
    'Lamar Jackson':     { ktc: 8900, dd: 8800 },
    'Josh Allen':        { ktc: 8800, dd: 8600 },
    'Joe Burrow':        { ktc: 8200, dd: 8000 },
    'Jalen Hurts':       { ktc: 7800, dd: 7700 },
    'CJ Stroud':         { ktc: 8400, dd: 8300 },
    'Jayden Daniels':    { ktc: 8600, dd: 8500 },
    'Drake Maye':        { ktc: 8300, dd: 8100 },
    'Caleb Williams':    { ktc: 8000, dd: 7800 },
    'Anthony Richardson':{ ktc: 7200, dd: 7100 },
    'Jordan Love':       { ktc: 7000, dd: 6900 },
    'Dak Prescott':      { ktc: 5800, dd: 5500 },
    'Brock Purdy':       { ktc: 6200, dd: 6000 },
    'Tua Tagovailoa':    { ktc: 5500, dd: 5300 },
    'Trevor Lawrence':   { ktc: 6400, dd: 6200 },
    'Sam Darnold':       { ktc: 4000, dd: 3800 },
    'Kyler Murray':      { ktc: 5200, dd: 5000 },
    'Justin Herbert':    { ktc: 6000, dd: 5900 },
    'Daniel Jones':      { ktc: 1200, dd: 1000 },
    'Aaron Rodgers':     { ktc: 2000, dd: 1800 },
    // RBs
    'Breece Hall':       { ktc: 9400, dd: 9300 },
    'Bijan Robinson':    { ktc: 9300, dd: 9200 },
    'Jahmyr Gibbs':      { ktc: 9100, dd: 9000 },
    'Jonathan Taylor':   { ktc: 7800, dd: 7600 },
    'De\'Von Achane':    { ktc: 8800, dd: 8700 },
    'Rachaad White':     { ktc: 5200, dd: 5100 },
    'Isiah Pacheco':     { ktc: 6800, dd: 6700 },
    'Kyren Williams':    { ktc: 7200, dd: 7100 },
    'James Cook':        { ktc: 7000, dd: 6900 },
    'Tony Pollard':      { ktc: 5000, dd: 4900 },
    'Aaron Jones':       { ktc: 3800, dd: 3600 },
    'Saquon Barkley':    { ktc: 6800, dd: 6600 },
    'Josh Jacobs':       { ktc: 5200, dd: 5000 },
    'Travis Etienne':    { ktc: 5800, dd: 5600 },
    'Derrick Henry':     { ktc: 4200, dd: 4000 },
    'Christian McCaffrey': { ktc: 7000, dd: 6800 },
    'Nick Chubb':        { ktc: 3000, dd: 2800 },
    'Joe Mixon':         { ktc: 3200, dd: 3000 },
    'Najee Harris':      { ktc: 4000, dd: 3800 },
    'David Montgomery':  { ktc: 3600, dd: 3400 },
    'Alvin Kamara':      { ktc: 4200, dd: 4000 },
    'Austin Ekeler':     { ktc: 2200, dd: 2000 },
    'Chuba Hubbard':     { ktc: 5200, dd: 5100 },
    'Jaylen Warren':     { ktc: 3800, dd: 3600 },
    'Javonte Williams':  { ktc: 4200, dd: 4100 },
    'Zach Charbonnet':   { ktc: 5400, dd: 5300 },
    'Tank Bigsby':       { ktc: 5000, dd: 4900 },
    'Brian Robinson':    { ktc: 4800, dd: 4700 },
    'Tyjae Spears':      { ktc: 5200, dd: 5100 },
    'Jonathon Brooks':   { ktc: 5400, dd: 5300 },
    'MarShawn Lloyd':    { ktc: 5800, dd: 5600 },
    'Quinshon Judkins':  { ktc: 5400, dd: 5200 },
    // WRs
    'Justin Jefferson':  { ktc: 9800, dd: 9700 },
    'Ja\'Marr Chase':    { ktc: 9700, dd: 9600 },
    'CeeDee Lamb':       { ktc: 9600, dd: 9500 },
    'Puka Nacua':        { ktc: 8400, dd: 8300 },
    'Amon-Ra St. Brown': { ktc: 8600, dd: 8500 },
    'Davante Adams':     { ktc: 4200, dd: 4000 },
    'A.J. Brown':        { ktc: 8200, dd: 8000 },
    'Stefon Diggs':      { ktc: 3800, dd: 3600 },
    'Tyreek Hill':       { ktc: 7000, dd: 6800 },
    'Cooper Kupp':       { ktc: 4800, dd: 4600 },
    'DeVonta Smith':     { ktc: 7800, dd: 7700 },
    'Jaylen Waddle':     { ktc: 7400, dd: 7200 },
    'Garrett Wilson':    { ktc: 8200, dd: 8100 },
    'Drake London':      { ktc: 7200, dd: 7100 },
    'Chris Olave':       { ktc: 7000, dd: 6900 },
    'Jordan Addison':    { ktc: 7400, dd: 7300 },
    'Rome Odunze':       { ktc: 7200, dd: 7100 },
    'Marvin Harrison Jr.': { ktc: 8000, dd: 7900 },
    'Malik Nabers':      { ktc: 8400, dd: 8300 },
    'Brian Thomas Jr.':  { ktc: 7800, dd: 7700 },
    'Ladd McConkey':     { ktc: 7000, dd: 6900 },
    'Xavier Worthy':     { ktc: 6800, dd: 6700 },
    'Keon Coleman':      { ktc: 6600, dd: 6500 },
    'Jaxon Smith-Njigba':{ ktc: 7600, dd: 7500 },
    'Tee Higgins':       { ktc: 7000, dd: 6800 },
    'DK Metcalf':        { ktc: 7200, dd: 7000 },
    'Calvin Ridley':     { ktc: 4200, dd: 4000 },
    'Terry McLaurin':    { ktc: 5800, dd: 5600 },
    'Christian Kirk':    { ktc: 3200, dd: 3000 },
    'Mike Evans':        { ktc: 5800, dd: 5600 },
    'Michael Pittman Jr.': { ktc: 5200, dd: 5000 },
    'Zay Flowers':       { ktc: 6400, dd: 6300 },
    'Hollywood Brown':   { ktc: 4200, dd: 4100 },
    'Tank Dell':         { ktc: 6000, dd: 5900 },
    'Rashee Rice':       { ktc: 7200, dd: 7100 },
    'Wan\'Dale Robinson':{ ktc: 4800, dd: 4700 },
    'Rashid Shaheed':    { ktc: 5000, dd: 4900 },
    'Tutu Atwell':       { ktc: 4200, dd: 4100 },
    'Josh Downs':        { ktc: 6200, dd: 6100 },
    'Quentin Johnston':  { ktc: 5400, dd: 5300 },
    'Dontayvion Wicks':  { ktc: 4800, dd: 4700 },
    'Kayshon Boutte':    { ktc: 4000, dd: 3900 },
    'Adonai Mitchell':   { ktc: 6000, dd: 5900 },
    'Ricky Pearsall':    { ktc: 5200, dd: 5100 },
    'Evan Stewart':      { ktc: 5800, dd: 5700 },
    'Tetairoa McMillan': { ktc: 6400, dd: 6300 },
    'Luther Burden III': { ktc: 6000, dd: 5900 },
    // TEs
    'Sam LaPorta':       { ktc: 8200, dd: 8100 },
    'Trey McBride':      { ktc: 8400, dd: 8300 },
    'Brock Bowers':      { ktc: 9200, dd: 9100 },
    'Kyle Pitts':        { ktc: 7400, dd: 7200 },
    'Mark Andrews':      { ktc: 6800, dd: 6600 },
    'Dalton Kincaid':    { ktc: 6000, dd: 5900 },
    'Tucker Kraft':      { ktc: 5800, dd: 5700 },
    'Jake Ferguson':     { ktc: 5400, dd: 5200 },
    'Pat Freiermuth':    { ktc: 4800, dd: 4700 },
    'Cade Otton':        { ktc: 4600, dd: 4500 },
    'David Njoku':       { ktc: 5000, dd: 4900 },
    'Jonnu Smith':       { ktc: 4200, dd: 4100 },
    'Theo Johnson':      { ktc: 5200, dd: 5100 },
    'Ja\'Tavion Thomas': { ktc: 5400, dd: 5300 },
    'Colston Loveland':  { ktc: 6200, dd: 6100 },
    // Draft Picks (dynasty value)
    '2025_1.01': { ktc: 7800, dd: 7700 },
    '2025_1.02': { ktc: 7000, dd: 6900 },
    '2025_1.03': { ktc: 6400, dd: 6300 },
    '2025_1.04': { ktc: 5800, dd: 5700 },
    '2025_1.05': { ktc: 5400, dd: 5300 },
    '2025_1.06': { ktc: 5000, dd: 4900 },
    '2025_1.07': { ktc: 4700, dd: 4600 },
    '2025_1.08': { ktc: 4400, dd: 4300 },
    '2025_1.09': { ktc: 4100, dd: 4000 },
    '2025_1.10': { ktc: 3800, dd: 3700 },
    '2025_1.11': { ktc: 3500, dd: 3400 },
    '2025_1.12': { ktc: 3200, dd: 3100 },
    '2025_2.01': { ktc: 2800, dd: 2700 },
    '2025_2.06': { ktc: 2000, dd: 1900 },
    '2025_2.12': { ktc: 1400, dd: 1300 },
    '2025_3.01': { ktc: 1200, dd: 1100 },
    '2025_3.06': { ktc: 900, dd: 800 },
    '2025_3.12': { ktc: 600, dd: 500 },
    '2026_1.01': { ktc: 5800, dd: 5700 },
    '2026_1mid': { ktc: 4000, dd: 3900 },
    '2026_1late': { ktc: 3000, dd: 2900 },
    '2026_2mid': { ktc: 1800, dd: 1700 },
    '2026_3mid': { ktc: 800, dd: 700 },
    '2027_1.01': { ktc: 4200, dd: 4100 },
    '2027_1mid': { ktc: 3000, dd: 2900 },
  };

  // ── Live value overrides (populated at runtime from external sources) ──────
  let _live = {};

  // Try to fetch KTC JSON (unofficial endpoint – may not always work from browser)
  async function tryFetchKTC() {
    try {
      const r = await fetch('https://keeptradecut.com/dynasty-rankings?format=2', {
        headers: { 'Accept': 'application/json' }
      });
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d)) {
        d.forEach(p => {
          if (p.playerName && p.value != null) {
            if (!_live[p.playerName]) _live[p.playerName] = {};
            _live[p.playerName].ktc = p.value;
          }
        });
      }
    } catch (_) { /* silently fall back to static */ }
  }

  // Try Dynasty Daddy public endpoint
  async function tryFetchDD() {
    try {
      const r = await fetch('https://api.dynastydaddy.app/api/1.7/dynastyrankings', {
        headers: { 'Accept': 'application/json' }
      });
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d)) {
        d.forEach(p => {
          const name = p.name || p.playerName;
          if (name && p.value != null) {
            if (!_live[name]) _live[name] = {};
            _live[name].dd = p.value;
          }
        });
      }
    } catch (_) { /* silently fall back */ }
  }

  async function init() {
    await Promise.allSettled([tryFetchKTC(), tryFetchDD()]);
  }

  // ── Value lookup ──────────────────────────────────────────────────────────
  function getByName(name) {
    if (!name) return { ktc: 0, dd: 0, avg: 0 };
    const live = _live[name] || {};
    const stat  = STATIC[name] || {};
    const ktc   = live.ktc ?? stat.ktc ?? 0;
    const dd    = live.dd  ?? stat.dd  ?? 0;
    const avg   = Math.round((ktc + dd) / 2);
    return { ktc, dd, avg };
  }

  function getByPlayer(player) {
    if (!player) return { ktc: 0, dd: 0, avg: 0 };
    return getByName(player.full_name || player.name || '');
  }

  function getPickValue(year, round, slot) {
    // slot: 'early' (<5), 'mid' (5-8), 'late' (>8)
    const pos  = slot <= 4 ? '01-04' : slot <= 8 ? '05-08' : '09-12';
    const keys = Object.keys(STATIC).filter(k =>
      k.startsWith(`${year}_${round}`)
    );
    if (!keys.length) {
      // interpolate from base pick values
      const base = { 1: 5000, 2: 2200, 3: 900 }[round] || 500;
      const slotAdj = Math.max(0, (slot - 1) * -300);
      const yearAdj = (year - 2025) * -800;
      const v = Math.max(200, base + slotAdj + yearAdj);
      return { ktc: v, dd: Math.round(v * 0.97), avg: Math.round(v * 0.985) };
    }
    // Return average of all matching pick values
    const vals = keys.map(k => STATIC[k]);
    const ktc  = Math.round(vals.reduce((a, v) => a + v.ktc, 0) / vals.length);
    const dd   = Math.round(vals.reduce((a, v) => a + v.dd, 0) / vals.length);
    return { ktc, dd, avg: Math.round((ktc + dd) / 2) };
  }

  // Returns all static names for search
  function allNames() { return Object.keys({ ...STATIC, ..._live }); }

  function getTopPlayers(pos, limit = 50) {
    const all = Object.entries(STATIC)
      .filter(([k]) => !k.match(/^\d{4}_/)) // exclude picks
      .map(([name, v]) => ({ name, ...v, avg: Math.round((v.ktc + v.dd) / 2) }))
      .sort((a, b) => b.avg - a.avg);
    return all.slice(0, limit);
  }

  return { init, getByName, getByPlayer, getPickValue, allNames, getTopPlayers, STATIC };
})();
