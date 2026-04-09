/* trades.js – Smart trade proposal engine */
const Trades = (() => {

  function generate() {
    const state = App.getState();
    if (!state) return;

    const container = document.getElementById('trade-proposals');
    container.innerHTML = '<div class="skeleton" style="height:120px;margin-bottom:1rem;"></div>'.repeat(3);

    setTimeout(() => {
      const proposals = buildProposals(state);
      renderProposals(proposals, container);
    }, 400);
  }

  function buildProposals(state) {
    const { myRoster, allRosters, users } = state;
    const proposals = [];

    const myNeeds  = analyzeNeeds(myRoster);
    const myAssets = getRosterAssets(myRoster);

    allRosters.forEach(otherRoster => {
      if (otherRoster.roster_id === myRoster.roster_id) return;

      const otherUser   = users.find(u => u.user_id === otherRoster.owner_id);
      const otherNeeds  = analyzeNeeds(otherRoster);
      const otherAssets = getRosterAssets(otherRoster);

      // Find mutually beneficial trades
      const trades = findMutualTrades(myAssets, otherAssets, myNeeds, otherNeeds, otherUser);
      proposals.push(...trades);
    });

    // Sort by value gain descending
    proposals.sort((a, b) => b.myGain - a.myGain);
    return proposals.slice(0, 8);
  }

  function analyzeNeeds(roster) {
    const players = (roster.players || []).map(id => PlayerDB.get(id)).filter(Boolean);
    const byPos = { QB: [], RB: [], WR: [], TE: [] };

    players.forEach(p => {
      const pos = p.position;
      if (byPos[pos]) {
        byPos[pos].push({ player: p, value: Values.getByPlayer(p).avg });
      }
    });

    const needs = [];
    // Weak positions = avg value of top-N at that position is low
    const benchmarks = { QB: 4000, RB: 4500, WR: 4500, TE: 3500 };
    const starters   = { QB: 1, RB: 2, WR: 3, TE: 1 };

    Object.entries(byPos).forEach(([pos, arr]) => {
      arr.sort((a, b) => b.value - a.value);
      const top = arr.slice(0, starters[pos]);
      const avgVal = top.length ? top.reduce((s, x) => s + x.value, 0) / top.length : 0;
      if (avgVal < benchmarks[pos]) needs.push(pos);
    });

    return needs;
  }

  function getRosterAssets(roster) {
    const players = (roster.players || []).map(id => {
      const p = PlayerDB.get(id);
      if (!p) return null;
      const v = Values.getByPlayer(p);
      return { type: 'player', id, name: p.full_name, pos: p.position, value: v.avg, ktc: v.ktc, dd: v.dd };
    }).filter(Boolean);

    // Add picks
    const picks = (roster.picks || []).map(pick => {
      const year  = pick.season || '2026';
      const round = pick.round  || 1;
      const slot  = pick.slot   || 6;
      const v = Values.getPickValue(year, round, slot);
      return {
        type: 'pick', id: `${year}_${round}.${String(slot).padStart(2,'0')}`,
        name: `${year} Round ${round} Pick`, pos: 'PICK',
        value: v.avg, ktc: v.ktc, dd: v.dd
      };
    });

    return [...players, ...picks].sort((a, b) => b.value - a.value);
  }

  function findMutualTrades(myAssets, theirAssets, myNeeds, theirNeeds, theirUser) {
    const results = [];
    const teamName = theirUser ? (theirUser.metadata?.team_name || theirUser.display_name || 'Unknown') : 'Unknown';

    // 1-for-1 trades at various value levels
    for (let i = 0; i < Math.min(myAssets.length, 8); i++) {
      const mine = myAssets[i];
      if (!mine || mine.value < 1000) continue;

      for (let j = 0; j < Math.min(theirAssets.length, 8); j++) {
        const theirs = theirAssets[j];
        if (!theirs || theirs.value < 1000) continue;

        const diff   = theirs.value - mine.value;
        const pctDiff = Math.abs(diff) / Math.max(mine.value, theirs.value);

        // Fair if within 15% value
        if (pctDiff < 0.20 && pctDiff > 0.02) {
          const posMatch = theirNeeds.includes(mine.pos) || myNeeds.includes(theirs.pos);
          if (posMatch) {
            results.push({
              teamName,
              iGive: [mine],
              iGet:  [theirs],
              myGain: diff,
              reason: `Addresses your ${theirs.pos} need. ${diff > 0 ? `You gain ~${diff} value.` : `Fair swap.`}`
            });
          }
        }
      }
    }

    // 2-for-1 trades (sell high)
    if (myAssets.length >= 2) {
      for (let i = 0; i < Math.min(myAssets.length - 1, 5); i++) {
        for (let j = i + 1; j < Math.min(myAssets.length, 6); j++) {
          const m1 = myAssets[i], m2 = myAssets[j];
          if (!m1 || !m2) continue;
          const combined = m1.value + m2.value;

          // Find a single asset of theirs worth ~80-110% of combined
          const target = theirAssets.find(t =>
            t && t.value > combined * 0.78 && t.value < combined * 1.12 &&
            (myNeeds.includes(t.pos) || t.value > combined * 0.9)
          );
          if (target) {
            const gain = target.value - combined;
            results.push({
              teamName,
              iGive: [m1, m2],
              iGet:  [target],
              myGain: gain,
              reason: gain > 0
                ? `Package deal – you consolidate for a high-value ${target.pos}.`
                : `Depth package for an elite ${target.pos} – worth the value cost.`
            });
          }
        }
      }
    }

    return results.slice(0, 3);
  }

  function renderProposals(proposals, container) {
    if (!proposals.length) {
      container.innerHTML = `
        <div class="card">
          <p style="color:var(--text2);text-align:center;padding:2rem 0;">
            No clear trade opportunities found. Your roster may already be well-balanced!
          </p>
        </div>`;
      return;
    }

    container.innerHTML = proposals.map(p => {
      const gainSign = p.myGain >= 0 ? '+' : '';
      const badge    = p.myGain > 200 ? 'win' : p.myGain < -200 ? 'loss' : 'fair';
      const badgeTxt = badge === 'win' ? '▲ Value Win' : badge === 'loss' ? '▼ Value Loss' : '≈ Fair Trade';
      const gainClass = p.myGain >= 0 ? 'value-positive' : 'value-negative';

      const giveItems = p.iGive.map(x => `
        <div class="trade-item">
          <span class="trade-item-name"><span class="pos-badge ${x.pos}">${x.pos}</span> ${x.name}</span>
          <span class="trade-item-val">${x.value.toLocaleString()}</span>
        </div>`).join('');

      const getItems = p.iGet.map(x => `
        <div class="trade-item">
          <span class="trade-item-name"><span class="pos-badge ${x.pos}">${x.pos}</span> ${x.name}</span>
          <span class="trade-item-val">${x.value.toLocaleString()}</span>
        </div>`).join('');

      const giveTotal = p.iGive.reduce((s, x) => s + x.value, 0);
      const getTotal  = p.iGet.reduce((s, x) => s + x.value, 0);

      return `
        <div class="trade-card">
          <div class="trade-header">
            <div class="trade-with">Trade with <strong>${p.teamName}</strong></div>
            <span class="trade-badge ${badge}">${badgeTxt}</span>
          </div>
          <div class="trade-sides">
            <div>
              <div class="trade-side-label">You give (${giveTotal.toLocaleString()})</div>
              <div class="trade-items">${giveItems}</div>
            </div>
            <div class="trade-arrow">⇄</div>
            <div>
              <div class="trade-side-label">You get (${getTotal.toLocaleString()})</div>
              <div class="trade-items">${getItems}</div>
            </div>
          </div>
          <div class="trade-footer">
            <span class="trade-reason">${p.reason}</span>
            <span class="trade-value-diff ${gainClass}">${gainSign}${p.myGain.toLocaleString()} value</span>
          </div>
        </div>`;
    }).join('');
  }

  return { generate };
})();
