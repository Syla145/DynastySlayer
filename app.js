/* app.js – Main application controller */
const App = (() => {

  let _state = null;

  // ── Screens ───────────────────────────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  function goToLanding() {
    showScreen('landing-screen');
    renderRecentLeagues();
  }

  function goToTeamPicker() {
    showScreen('team-picker-screen');
  }

  function switchLeague() { goToLanding(); }
  function getState()     { return _state; }

  // ── Loader ────────────────────────────────────────────────────────────────
  function showLoader(text = 'Loading...', pct = 0) {
    const el = document.getElementById('global-loader');
    el.classList.remove('hidden');
    document.getElementById('loader-text').textContent = text;
    document.getElementById('loader-fill').style.width = pct + '%';
  }

  function setLoaderProgress(text, pct) {
    document.getElementById('loader-text').textContent = text;
    document.getElementById('loader-fill').style.width = pct + '%';
  }

  function hideLoader() {
    document.getElementById('global-loader').classList.add('hidden');
  }

  function showToast(msg, duration = 3000) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), duration);
  }

  function showError(msg) {
    const el = document.getElementById('input-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError() {
    document.getElementById('input-error').classList.add('hidden');
  }

  // ── Recent leagues (localStorage) ─────────────────────────────────────────
  function getRecentLeagues() {
    try { return JSON.parse(localStorage.getItem('ds_recent') || '[]'); }
    catch { return []; }
  }

  function saveRecentLeague(id, name) {
    try {
      let list = getRecentLeagues().filter(l => l.id !== id);
      list.unshift({ id, name });
      list = list.slice(0, 5);
      localStorage.setItem('ds_recent', JSON.stringify(list));
    } catch (_) {}
  }

  function renderRecentLeagues() {
    const list = getRecentLeagues();
    const wrap = document.getElementById('recent-leagues');
    const cont = document.getElementById('recent-list');
    if (!list.length) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    cont.innerHTML = list.map(l => `
      <span class="recent-chip" title="${l.name}" onclick="App.loadLeagueId('${l.id}')">
        ${l.name || l.id}
      </span>`).join('');
  }

  // ── Load League ───────────────────────────────────────────────────────────
  async function loadLeague() {
    const input = document.getElementById('league-id-input').value.trim();
    if (!input) { showError('Please enter a League ID.'); return; }
    await loadLeagueId(input);
  }

  async function loadLeagueId(id) {
    document.getElementById('league-id-input').value = id;
    hideError();
    showLoader('Connecting to Sleeper...', 5);

    try {
      // Fetch league info
      setLoaderProgress('Fetching league info...', 15);
      const leagueInfo = await SleeperAPI.getLeague(id);

      if (!leagueInfo || leagueInfo.status === 'error') {
        throw new Error('League not found. Check your League ID.');
      }

      setLoaderProgress('Loading rosters...', 30);
      const [rosters, users] = await Promise.all([
        SleeperAPI.getRosters(id),
        SleeperAPI.getUsers(id),
      ]);

      setLoaderProgress('Fetching draft picks...', 45);
      const tradedPicks = await SleeperAPI.getDraftPicks(id).catch(() => []);

      // Attach traded picks to rosters
      rosters.forEach(r => {
        r.picks = tradedPicks.filter(p =>
          p.owner_id === String(r.roster_id) &&
          Number(p.season) >= new Date().getFullYear()
        );
      });

      setLoaderProgress('Loading player database...', 55);
      await PlayerDB.load((msg, pct) => setLoaderProgress(msg, 55 + pct * 0.2));

      setLoaderProgress('Initializing trade values...', 80);
      await Values.init();

      setLoaderProgress('Building your dashboard...', 90);

      // Store partial state for team picker
      _state = { leagueInfo, rosters, users, tradedPicks, id };

      saveRecentLeague(id, leagueInfo.name);

      // Render team picker
      renderTeamPicker();

      hideLoader();
      showScreen('team-picker-screen');

    } catch (err) {
      hideLoader();
      showError(err.message || 'Failed to load league. Please try again.');
    }
  }

  function renderTeamPicker() {
    const { leagueInfo, rosters, users } = _state;

    document.getElementById('league-name-display').textContent = leagueInfo.name || 'Unnamed League';
    document.getElementById('league-meta').textContent =
      `${leagueInfo.total_rosters} teams · ${leagueInfo.season} · ${leagueInfo.scoring_settings?.rec ? 'PPR' : 'Standard'}`;

    const grid = document.getElementById('team-grid');
    grid.innerHTML = rosters.map(roster => {
      const user     = users.find(u => u.user_id === roster.owner_id);
      const teamName = user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
      const owner    = user?.display_name || 'Unknown';
      const wins     = roster.settings?.wins   || 0;
      const losses   = roster.settings?.losses || 0;
      return `
        <div class="team-card" onclick="App.selectTeam('${roster.roster_id}')">
          <div class="team-card-name">${teamName}</div>
          <div class="team-card-owner">@${owner}</div>
          <div class="team-card-record">${wins}W – ${losses}L</div>
        </div>`;
    }).join('');
  }

  // ── Select Team & Render Main App ─────────────────────────────────────────
  async function selectTeam(rosterId) {
    showLoader('Building your dynasty analysis...', 85);

    const { leagueInfo, rosters, users } = _state;
    const myRoster = rosters.find(r => String(r.roster_id) === String(rosterId));
    if (!myRoster) { hideLoader(); showToast('Team not found.'); return; }

    const myUser = users.find(u => u.user_id === myRoster.owner_id);
    const teamName = myUser?.metadata?.team_name || myUser?.display_name || `Team ${rosterId}`;

    // Compute needs for draft recommendations
    const myNeeds = computeNeeds(myRoster);

    _state = { ..._state, myRoster, myUser, teamName, myNeeds, allRosters: rosters };

    setLoaderProgress('Rendering dashboard...', 95);

    // Update header
    document.getElementById('header-team-name').textContent = teamName;

    // Render all tabs
    renderDashboard();
    renderRoster();
    Draft.render(_state);
    League.render(_state);
    setupCalculator();

    hideLoader();
    showScreen('main-screen');
  }

  function computeNeeds(roster) {
    const players = (roster.players || []).map(id => PlayerDB.get(id)).filter(Boolean);
    const byPos   = { QB: [], RB: [], WR: [], TE: [] };
    players.forEach(p => { if (byPos[p.position]) byPos[p.position].push(Values.getByPlayer(p).avg); });
    const thresholds = { QB: 4000, RB: 4000, WR: 4200, TE: 3500 };
    const starters   = { QB: 1, RB: 2, WR: 3, TE: 1 };
    const needs = [];
    Object.entries(byPos).forEach(([pos, vals]) => {
      vals.sort((a, b) => b - a);
      const top  = vals.slice(0, starters[pos]);
      const avg  = top.length ? top.reduce((s, v) => s + v, 0) / top.length : 0;
      if (avg < thresholds[pos]) needs.push(pos);
    });
    return needs;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  function renderDashboard() {
    const { myRoster, teamName } = _state;
    const players = (myRoster.players || []).map(id => PlayerDB.get(id)).filter(Boolean);

    // Total value + grade
    const vals = players.map(p => Values.getByPlayer(p));
    const total = vals.reduce((s, v) => s + v.avg, 0);
    document.getElementById('total-value').textContent = Math.round(total / 1000) + 'k';

    const grade = getGrade(total, players.length);
    document.getElementById('roster-grade').textContent = grade.letter;
    document.getElementById('roster-grade-label').textContent = grade.label;

    // Average age
    const ages = players.filter(p => p.age).map(p => p.age);
    const avgAge = ages.length ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1) : '–';
    document.getElementById('avg-age').textContent = avgAge;

    // Record
    const wins   = myRoster.settings?.wins   || 0;
    const losses = myRoster.settings?.losses || 0;
    const ties   = myRoster.settings?.ties   || 0;
    document.getElementById('team-record').textContent = `${wins} – ${losses}${ties ? ` – ${ties}` : ''}`;

    // Position bars
    const byPos = { QB: 0, RB: 0, WR: 0, TE: 0 };
    players.forEach(p => {
      if (byPos[p.position] !== undefined) {
        byPos[p.position] += Values.getByPlayer(p).avg;
      }
    });
    const maxPosVal = Math.max(...Object.values(byPos)) || 1;
    document.getElementById('position-bars').innerHTML = Object.entries(byPos).map(([pos, val]) => `
      <div class="pos-row">
        <span class="pos-label ${pos}">${pos}</span>
        <div class="pos-bar-wrap"><div class="pos-bar ${pos}" style="width:${Math.round(val / maxPosVal * 100)}%"></div></div>
        <span class="pos-value">${Math.round(val / 1000)}k</span>
      </div>`).join('');

    // Age curve chart (simple SVG bar chart)
    renderAgeCurve(players);

    // Quick insights
    renderInsights(players, byPos, avgAge);
  }

  function getGrade(total, playerCount) {
    const perPlayer = playerCount ? total / playerCount : 0;
    if (perPlayer > 5500) return { letter: 'A+', label: 'Elite Dynasty Roster' };
    if (perPlayer > 4500) return { letter: 'A',  label: 'Strong Contender' };
    if (perPlayer > 3800) return { letter: 'B+', label: 'Above Average' };
    if (perPlayer > 3200) return { letter: 'B',  label: 'Solid Roster' };
    if (perPlayer > 2600) return { letter: 'C+', label: 'Rebuilding Mode' };
    if (perPlayer > 2000) return { letter: 'C',  label: 'Needs Work' };
    return { letter: 'D', label: 'Full Rebuild' };
  }

  function renderAgeCurve(players) {
    const buckets = {};
    players.filter(p => p.age && ['QB','RB','WR','TE'].includes(p.position)).forEach(p => {
      const age = p.age;
      if (!buckets[age]) buckets[age] = 0;
      buckets[age]++;
    });

    const ages = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    if (!ages.length) {
      document.getElementById('age-curve-chart').innerHTML = '<p style="color:var(--text3);font-size:0.82rem;padding:1rem 0;">No age data available.</p>';
      return;
    }

    const maxCount = Math.max(...Object.values(buckets));
    const w = 300, h = 120, pad = 20;
    const barW = Math.max(10, (w - pad * 2) / ages.length - 3);

    const bars = ages.map((age, i) => {
      const count  = buckets[age] || 0;
      const barH   = Math.round((count / maxCount) * (h - pad - 20));
      const x      = pad + i * ((w - pad * 2) / ages.length);
      const y      = h - pad - barH;
      const color  = age <= 24 ? '#10b981' : age <= 27 ? '#3b82f6' : age <= 30 ? '#f59e0b' : '#e53e3e';
      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="${color}" rx="2" opacity="0.8"/>
        <text x="${x + barW / 2}" y="${h - 5}" font-size="9" fill="#55556a" text-anchor="middle">${age}</text>`;
    }).join('');

    document.getElementById('age-curve-chart').innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" class="age-chart-svg" xmlns="http://www.w3.org/2000/svg">
        ${bars}
        <text x="4" y="14" font-size="9" fill="#55556a">Count</text>
      </svg>`;
  }

  function renderInsights(players, byPos, avgAge) {
    const insights = [];
    const age = parseFloat(avgAge);

    // Age insight
    if (age < 24.5)       insights.push({ icon: '🟢', cls: 'insight-good', text: `Young roster (avg age ${avgAge}) – strong dynasty future.` });
    else if (age < 27)    insights.push({ icon: '🔵', cls: 'insight-good', text: `Prime-age roster (avg ${avgAge}) – ready to compete now.` });
    else if (age < 29)    insights.push({ icon: '🟡', cls: 'insight-warn', text: `Aging core (avg ${avgAge}) – consider selling aging veterans.` });
    else                  insights.push({ icon: '🔴', cls: 'insight-bad',  text: `Old roster (avg ${avgAge}) – prioritize youth in trades/draft.` });

    // Position depth
    const needs = _state.myNeeds || [];
    if (needs.includes('QB')) insights.push({ icon: '⚠️', cls: 'insight-warn', text: 'Weak at QB – consider targeting a young signal-caller.' });
    if (needs.includes('RB')) insights.push({ icon: '⚠️', cls: 'insight-warn', text: 'RB corps needs upgrading – a top-12 RB would help significantly.' });
    if (needs.includes('WR')) insights.push({ icon: '⚠️', cls: 'insight-warn', text: 'WR depth is thin – target a high-upside WR in trades or draft.' });
    if (needs.includes('TE')) insights.push({ icon: '⚠️', cls: 'insight-warn', text: 'Weak at TE – elite TEs carry massive dynasty value.' });

    if (!needs.length) insights.push({ icon: '✅', cls: 'insight-good', text: 'Well-balanced roster across all positions!' });

    // Top asset
    const topPlayer = players
      .map(p => ({ p, v: Values.getByPlayer(p).avg }))
      .sort((a, b) => b.v - a.v)[0];
    if (topPlayer && topPlayer.v > 7000) {
      insights.push({ icon: '⭐', cls: 'insight-good', text: `${topPlayer.p.full_name} is your crown jewel (value: ${topPlayer.v.toLocaleString()}).` });
    }

    document.getElementById('quick-insights').innerHTML = insights.map(i => `
      <div class="insight-item ${i.cls}">
        <span class="insight-icon">${i.icon}</span>
        <span>${i.text}</span>
      </div>`).join('');
  }

  // ── Roster Tab ────────────────────────────────────────────────────────────
  function renderRoster(filterPos = 'ALL') {
    const { myRoster } = _state;
    const container = document.getElementById('roster-table');

    const players = (myRoster.players || [])
      .map(id => {
        const p = PlayerDB.get(id);
        if (!p) return null;
        const v = Values.getByPlayer(p);
        return { ...p, ktcVal: v.ktc, ddVal: v.dd, avgVal: v.avg };
      })
      .filter(Boolean)
      .filter(p => filterPos === 'ALL' || p.position === filterPos)
      .sort((a, b) => b.avgVal - a.avgVal);

    // Add picks if ALL or PICK filter
    const picks = filterPos === 'ALL' || filterPos === 'PICK'
      ? (myRoster.picks || []).map(pick => {
          const year  = pick.season || '2026';
          const round = pick.round  || 1;
          const slot  = pick.slot   || 6;
          const v = Values.getPickValue(year, round, slot);
          return {
            full_name: `${year} Round ${round} Pick`,
            position: 'PICK', team: '–',
            ktcVal: v.ktc, ddVal: v.dd, avgVal: v.avg,
            age: null,
          };
        })
      : [];

    const allRows = [...players, ...picks].sort((a, b) => b.avgVal - a.avgVal);

    const header = `
      <div class="roster-row header">
        <span>Pos</span><span>Player</span>
        <span style="text-align:right">Age</span>
        <span class="val-ktc" style="text-align:right">KTC</span>
        <span class="val-dd"  style="text-align:right">DD</span>
        <span style="text-align:right">Avg</span>
      </div>`;

    const rows = allRows.map(p => {
      const pfrSlug = p.full_name ? p.full_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : '';
      const pfrUrl  = p.position !== 'PICK' ? `https://www.pro-football-reference.com/search/search.fcgi?query=${encodeURIComponent(p.full_name)}` : '';
      return `
        <div class="roster-row">
          <span class="pos-badge ${p.position}">${p.position}</span>
          <div>
            <div class="player-name">
              ${p.full_name}
              ${pfrUrl ? `<a href="${pfrUrl}" target="_blank" class="pfr-link" title="View on Pro Football Reference">↗ PFR</a>` : ''}
            </div>
            <div class="player-team">${p.team || '–'}</div>
          </div>
          <span class="mono-val" style="text-align:right">${p.age || '–'}</span>
          <span class="mono-val val-ktc" style="text-align:right">${p.ktcVal ? p.ktcVal.toLocaleString() : '–'}</span>
          <span class="mono-val val-dd"  style="text-align:right">${p.ddVal  ? p.ddVal.toLocaleString()  : '–'}</span>
          <span class="mono-val val-avg" style="text-align:right">${p.avgVal ? p.avgVal.toLocaleString() : '–'}</span>
        </div>`;
    }).join('');

    container.innerHTML = header + (rows || '<p style="color:var(--text3);padding:1rem;font-size:0.85rem;">No players found.</p>');

    // Setup filter buttons
    document.querySelectorAll('#tab-roster .filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#tab-roster .filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        renderRoster(this.dataset.pos);
      });
    });
  }

  // ── Trade Calculator ──────────────────────────────────────────────────────
  function setupCalculator() {
    const sidesA = [], sidesB = [];

    function buildSearch(inputId, resultsId, sides, otherId) {
      const input   = document.getElementById(inputId);
      const results = document.getElementById(resultsId);

      input.addEventListener('input', () => {
        const q = input.value.trim();
        if (q.length < 2) { results.classList.add('hidden'); return; }

        const players = PlayerDB.search(q, 12);
        // Add pick search
        const pickMatches = [
          '2025 Round 1', '2025 Round 2', '2025 Round 3',
          '2026 Round 1', '2026 Round 2', '2026 Round 3',
          '2027 Round 1',
        ].filter(p => p.toLowerCase().includes(q.toLowerCase())).slice(0, 3);

        if (!players.length && !pickMatches.length) { results.classList.add('hidden'); return; }

        results.innerHTML = [
          ...players.map(p => {
            const v = Values.getByPlayer(p);
            return `<div class="search-result-item" onclick="App._calcAdd('${p.player_id}','${escHtml(p.full_name)}','${p.position}',${v.avg},'${inputId}')">
              <span><span class="pos-badge ${p.position}" style="font-size:0.68rem">${p.position}</span> ${escHtml(p.full_name)}</span>
              <span class="mono-val" style="color:var(--text2)">${v.avg.toLocaleString()}</span>
            </div>`;
          }),
          ...pickMatches.map(pick => {
            const [yearStr, , roundStr] = pick.split(' ');
            const year = parseInt(yearStr), round = parseInt(roundStr);
            const v = Values.getPickValue(year, round, 6);
            return `<div class="search-result-item" onclick="App._calcAddPick('${escHtml(pick)}',${v.avg},'${inputId}')">
              <span><span class="pos-badge PICK" style="font-size:0.68rem">PICK</span> ${pick}</span>
              <span class="mono-val" style="color:var(--text2)">${v.avg.toLocaleString()}</span>
            </div>`;
          }),
        ].join('');
        results.classList.remove('hidden');
      });

      document.addEventListener('click', e => {
        if (!input.contains(e.target) && !results.contains(e.target)) results.classList.add('hidden');
      });
    }

    buildSearch('calc-search-a', 'calc-search-results-a', sidesA, 'b');
    buildSearch('calc-search-b', 'calc-search-results-b', sidesB, 'a');

    // Expose add functions
    window._calcSidesA = sidesA;
    window._calcSidesB = sidesB;

    updateCalcTotals();
  }

  function _calcAdd(id, name, pos, value, inputId) {
    const side  = inputId.endsWith('a') ? window._calcSidesA : window._calcSidesB;
    const panelId = inputId.endsWith('a') ? 'calc-side-a' : 'calc-side-b';
    if (side.find(x => x.id === id)) { showToast('Already added.'); return; }
    side.push({ id, name, pos, value });
    document.getElementById(inputId.replace('search-', '')).value = '';
    document.getElementById(inputId.replace('calc-search-', 'calc-search-results-')).classList.add('hidden');
    renderCalcSide(panelId, side);
    updateCalcTotals();
  }

  function _calcAddPick(name, value, inputId) {
    const id = name.replace(/\s+/g, '_');
    _calcAdd(id, name, 'PICK', value, inputId);
  }

  function renderCalcSide(panelId, side) {
    const container = document.getElementById(panelId);
    container.innerHTML = side.map(item => `
      <div class="calc-player-row">
        <span class="pos-badge ${item.pos}" style="font-size:0.7rem;margin-right:0.4rem">${item.pos}</span>
        <span class="calc-player-name">${item.name}</span>
        <span class="calc-player-val">${item.value.toLocaleString()}</span>
        <button class="calc-remove" onclick="App._calcRemove('${item.id}','${panelId}')">✕</button>
      </div>`).join('');
  }

  function _calcRemove(id, panelId) {
    const side = panelId.endsWith('a') ? window._calcSidesA : window._calcSidesB;
    const idx  = side.findIndex(x => x.id === id);
    if (idx !== -1) side.splice(idx, 1);
    renderCalcSide(panelId, side);
    updateCalcTotals();
  }

  function updateCalcTotals() {
    const sa = window._calcSidesA || [], sb = window._calcSidesB || [];
    const totA = sa.reduce((s, x) => s + x.value, 0);
    const totB = sb.reduce((s, x) => s + x.value, 0);
    document.getElementById('calc-total-a').textContent = totA.toLocaleString();
    document.getElementById('calc-total-b').textContent = totB.toLocaleString();

    const diff  = totA - totB;
    const pct   = totB ? Math.abs(diff / totB * 100).toFixed(1) : 0;
    let verdict = '';
    if (!totA && !totB) verdict = 'Add players to compare';
    else if (Math.abs(diff) < 300)     verdict = '≈ Fair trade';
    else if (diff > 0)  verdict = `Side A wins by ${diff.toLocaleString()} (${pct}%)`;
    else                verdict = `Side B wins by ${Math.abs(diff).toLocaleString()} (${pct}%)`;
    document.getElementById('calc-verdict').textContent = verdict;

    // Comparison table
    const allPlayers = [...sa, ...sb];
    if (!allPlayers.length) {
      document.getElementById('calc-comparison').innerHTML = '<p style="color:var(--text3);font-size:0.85rem;">Add players to see value breakdown.</p>';
      return;
    }

    const header = `
      <div class="comp-row header">
        <span>Player</span><span style="text-align:right">KTC</span>
        <span style="text-align:right">DD</span><span style="text-align:right">Avg</span>
      </div>`;

    const rows = allPlayers.map(item => {
      const p = PlayerDB.get(item.id);
      let ktc = item.value, dd = item.value;
      if (p) { const v = Values.getByPlayer(p); ktc = v.ktc; dd = v.dd; }
      return `
        <div class="comp-row">
          <span style="font-size:0.85rem"><span class="pos-badge ${item.pos}" style="font-size:0.7rem">${item.pos}</span> ${item.name}</span>
          <span class="mono-val val-ktc" style="text-align:right">${ktc.toLocaleString()}</span>
          <span class="mono-val val-dd"  style="text-align:right">${dd.toLocaleString()}</span>
          <span class="mono-val val-avg" style="text-align:right">${item.value.toLocaleString()}</span>
        </div>`;
    }).join('');

    document.getElementById('calc-comparison').innerHTML = header + rows;
  }

  function escHtml(str) {
    return String(str).replace(/'/g, '\\\'').replace(/"/g, '&quot;');
  }

  // ── Tab Navigation ────────────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('tab-' + this.dataset.tab).classList.add('active');
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    setupTabs();
    renderRecentLeagues();

    document.getElementById('load-league-btn').addEventListener('click', loadLeague);
    document.getElementById('league-id-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') loadLeague();
    });

    // Expose needed globals
    window.App = {
      goToLanding, goToTeamPicker, switchLeague, loadLeagueId,
      selectTeam, getState,
      _calcAdd, _calcAddPick, _calcRemove,
    };
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
