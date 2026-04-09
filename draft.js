/* draft.js – Rookie draft board + recommendations */
const Draft = (() => {

  // Top 2025 rookie prospects with consensus dynasty values
  const ROOKIES_2025 = [
    { rank: 1,  name: 'Ashton Jeanty',     pos: 'RB', team: 'LV',  ktc: 8200, dd: 8100, adp: 1.02, note: 'Elite workhorse RB, immediate starter' },
    { rank: 2,  name: 'Tetairoa McMillan', pos: 'WR', team: 'CAR', ktc: 6400, dd: 6300, adp: 1.03, note: 'Huge target share, red zone beast' },
    { rank: 3,  name: 'Travis Hunter',     pos: 'WR', team: 'JAX', ktc: 6800, dd: 6700, adp: 1.02, note: 'Two-way phenom, WR role upside' },
    { rank: 4,  name: 'Omarion Hampton',   pos: 'RB', team: 'LAC', ktc: 6200, dd: 6100, adp: 1.04, note: 'Volume back, good offense' },
    { rank: 5,  name: 'Luther Burden III', pos: 'WR', team: 'CHI', ktc: 6000, dd: 5900, adp: 1.05, note: 'Fields connection, slot specialist' },
    { rank: 6,  name: 'Quinshon Judkins',  pos: 'RB', team: 'CLE', ktc: 5400, dd: 5200, adp: 1.06, note: 'Physical runner, volume upside' },
    { rank: 7,  name: 'Jaydn Ott',         pos: 'RB', team: 'SF',  ktc: 4800, dd: 4700, adp: 1.08, note: 'Great situation, efficient runner' },
    { rank: 8,  name: 'Emeka Egbuka',      pos: 'WR', team: 'TB',  ktc: 5200, dd: 5100, adp: 1.07, note: 'Trusted route runner, good hands' },
    { rank: 9,  name: 'Colston Loveland',  pos: 'TE', team: 'CHI', ktc: 6200, dd: 6100, adp: 1.09, note: 'Top TE, Kmet replacement' },
    { rank: 10, name: 'Evan Stewart',      pos: 'WR', team: 'JAX', ktc: 5800, dd: 5700, adp: 1.10, note: 'Speed threat, volatile usage' },
    { rank: 11, name: 'Kaleb Johnson',     pos: 'RB', team: 'PIT', ktc: 4600, dd: 4500, adp: 1.11, note: 'Big back, goal-line role likely' },
    { rank: 12, name: 'Elic Ayomanor',     pos: 'WR', team: 'TEN', ktc: 4800, dd: 4700, adp: 1.12, note: 'WR1 target in growing offense' },
    { rank: 13, name: 'Tre Harris',        pos: 'WR', team: 'LAR', ktc: 5000, dd: 4900, adp: 2.01, note: 'Physical WR, McVay offense' },
    { rank: 14, name: 'Jack Bech',         pos: 'WR', team: 'LV',  ktc: 4400, dd: 4300, adp: 2.02, note: 'Slot specialist, reliable' },
    { rank: 15, name: 'MarShawn Lloyd',    pos: 'RB', team: 'TB',  ktc: 5800, dd: 5600, adp: 2.02, note: 'Elite receiving back, Fournette clone' },
    { rank: 16, name: 'Kyle Williams',     pos: 'WR', team: 'NE',  ktc: 4200, dd: 4100, adp: 2.04, note: 'Good athlete, sketchy situation' },
    { rank: 17, name: 'Ja\'Tavion Thomas', pos: 'TE', team: 'IND', ktc: 5400, dd: 5300, adp: 2.03, note: 'TE upside, raw blocker' },
    { rank: 18, name: 'Elic Ayomanor',     pos: 'WR', team: 'TEN', ktc: 3800, dd: 3700, adp: 2.05, note: 'Sneaky upside' },
    { rank: 19, name: 'TreVeyon Henderson',pos: 'RB', team: 'NE',  ktc: 4400, dd: 4300, adp: 2.06, note: 'Elite talent, crowded backfield' },
    { rank: 20, name: 'Jonathon Brooks',   pos: 'RB', team: 'CAR', ktc: 5400, dd: 5300, adp: 2.01, note: 'If healthy, massive upside' },
    { rank: 21, name: 'Dillon Gabriel',    pos: 'QB', team: 'CLE', ktc: 4200, dd: 4100, adp: 2.07, note: 'SF QB, volume throws' },
    { rank: 22, name: 'Cam Ward',          pos: 'QB', team: 'TEN', ktc: 4800, dd: 4700, adp: 2.04, note: '#1 overall pick, immediate starter' },
    { rank: 23, name: 'Jalen Milroe',      pos: 'QB', team: 'SEA', ktc: 4600, dd: 4500, adp: 2.05, note: 'Rushing floor, Geno heir' },
    { rank: 24, name: 'Nick Emmanwori',    pos: 'TE', team: 'KC',  ktc: 3800, dd: 3700, adp: 2.08, note: 'Athletic freak, rawness concern' },
    { rank: 25, name: 'Savion Williams',   pos: 'WR', team: 'DAL', ktc: 3600, dd: 3500, adp: 2.10, note: 'Big body WR, good situation' },
    { rank: 26, name: 'Chris Barriere',    pos: 'RB', team: 'NO',  ktc: 3400, dd: 3300, adp: 3.01, note: 'Change-of-pace, spot starter' },
    { rank: 27, name: 'Darien Porter',     pos: 'WR', team: 'IND', ktc: 3200, dd: 3100, adp: 3.02, note: 'Deep threat, low target share' },
    { rank: 28, name: 'Tyler Warren',      pos: 'TE', team: 'IND', ktc: 5600, dd: 5500, adp: 1.10, note: 'Top TE prospect, Indy starter' },
    { rank: 29, name: 'Rashad Amos',       pos: 'RB', team: 'DEN', ktc: 2800, dd: 2700, adp: 3.04, note: 'Power runner, depth role' },
    { rank: 30, name: 'Jalen Royals',      pos: 'WR', team: 'TEN', ktc: 3000, dd: 2900, adp: 3.03, note: 'Dynasty flier, contested catcher' },
  ];

  let _currentFilter = 'ALL';

  function render(state) {
    renderBoard(state);
    renderYourPicks(state);
    setupFilters();
  }

  function renderBoard(state) {
    const board = document.getElementById('draft-board');

    const header = `
      <div class="draft-row header">
        <span>#</span><span>POS</span><span>Player</span>
        <span style="text-align:right">KTC</span>
        <span style="text-align:right">DD</span>
        <span style="text-align:right">Avg</span>
        <span>Rec</span>
      </div>`;

    const rows = ROOKIES_2025
      .filter(r => _currentFilter === 'ALL' || getPickRound(r.adp) === Number(_currentFilter))
      .map(r => {
        const avg = Math.round((r.ktc + r.dd) / 2);
        const rec = getRecommendation(r, state);
        return `
          <div class="draft-row">
            <span class="draft-rank">${r.rank}</span>
            <span class="pos-badge ${r.pos}">${r.pos}</span>
            <div>
              <div class="player-name">${r.name}</div>
              <div class="player-team">${r.team} · ADP ${r.adp.toFixed(2)}</div>
            </div>
            <span class="mono-val val-ktc" style="text-align:right">${r.ktc.toLocaleString()}</span>
            <span class="mono-val val-dd"  style="text-align:right">${r.dd.toLocaleString()}</span>
            <span class="mono-val val-avg" style="text-align:right">${avg.toLocaleString()}</span>
            <span class="draft-rec ${rec.cls}">${rec.label}</span>
          </div>`;
      }).join('');

    board.innerHTML = header + rows;
  }

  function getPickRound(adp) {
    return Math.ceil(adp);
  }

  function getRecommendation(rookie, state) {
    if (!state) return { label: 'FAIR', cls: 'fair' };
    const needs = state.myNeeds || [];
    if (needs.includes(rookie.pos)) return { label: '★ TARGET', cls: 'value' };
    const avg = (rookie.ktc + rookie.dd) / 2;
    if (avg > 6000) return { label: '◆ VALUE', cls: 'value' };
    if (avg < 3000) return { label: '↓ REACH', cls: 'reach' };
    return { label: '= FAIR', cls: 'fair' };
  }

  function renderYourPicks(state) {
    const container = document.getElementById('your-picks');
    if (!state || !state.myRoster) {
      container.innerHTML = '<p style="color:var(--text3);font-size:0.85rem;">No picks data available.</p>';
      return;
    }

    const picks = state.myRoster.picks || [];
    if (!picks.length) {
      container.innerHTML = '<p style="color:var(--text3);font-size:0.85rem;">No draft picks found for your roster. Check traded picks.</p>';
      return;
    }

    container.innerHTML = picks.map(p => {
      const year  = p.season || '2026';
      const round = p.round  || 1;
      const slot  = p.slot ? `Slot ${p.slot}` : 'Unknown Slot';
      return `<div class="pick-chip">${year} R${round} · ${slot}</div>`;
    }).join('');
  }

  function setupFilters() {
    document.querySelectorAll('#tab-draft .filter-btn[data-round]').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#tab-draft .filter-btn[data-round]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        _currentFilter = this.dataset.round;
        const state = App.getState();
        renderBoard(state);
      });
    });
  }

  return { render };
})();
