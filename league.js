/* league.js – Power rankings, standings, playoff predictions */
const League = (() => {

  function render(state) {
    renderPowerRankings(state);
    renderPlayoffProbs(state);
    renderStandings(state);
  }

  function renderPowerRankings(state) {
    const container = document.getElementById('power-rankings');
    const { allRosters, users, myRoster } = state;

    // Score each roster by total avg value
    const ranked = allRosters.map(roster => {
      const user     = users.find(u => u.user_id === roster.owner_id);
      const teamName = user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
      const owner    = user?.display_name || 'Unknown';

      const players = (roster.players || []).map(id => PlayerDB.get(id)).filter(Boolean);
      const totalValue = players.reduce((sum, p) => sum + Values.getByPlayer(p).avg, 0);
      const pickValue  = (roster.picks || []).reduce((sum, pick) => {
        return sum + Values.getPickValue(pick.season || '2026', pick.round || 1, pick.slot || 6).avg;
      }, 0);

      return {
        teamName, owner,
        rosterId: roster.roster_id,
        totalValue: totalValue + pickValue,
        wins:   roster.settings?.wins   || 0,
        losses: roster.settings?.losses || 0,
        pts:    roster.settings?.fpts   || 0,
        isMe:   roster.roster_id === myRoster.roster_id,
      };
    }).sort((a, b) => b.totalValue - a.totalValue);

    const maxVal = ranked[0]?.totalValue || 1;

    const header = `
      <div class="pr-row header">
        <span>Rank</span><span>Team</span>
        <span>Value</span><span>Record</span><span>Pts</span>
      </div>`;

    const rows = ranked.map((t, i) => `
      <div class="pr-row ${t.isMe ? 'my-team-row' : ''}">
        <span class="pr-rank ${i < 3 ? 'top3' : ''}">${i + 1}</span>
        <div>
          <div class="pr-name">${t.teamName} ${t.isMe ? '⚔️' : ''}</div>
          <div class="pr-owner">@${t.owner}</div>
          <div class="pr-bar-wrap"><div class="pr-bar" style="width:${Math.round(t.totalValue / maxVal * 100)}%"></div></div>
        </div>
        <span class="mono-val">${Math.round(t.totalValue / 1000)}k</span>
        <span class="mono-val">${t.wins}-${t.losses}</span>
        <span class="mono-val">${Math.round(t.pts)}</span>
      </div>`).join('');

    container.innerHTML = header + rows;
  }

  function renderPlayoffProbs(state) {
    const container = document.getElementById('playoff-probs');
    const { allRosters, users, myRoster, leagueInfo } = state;

    const playoffTeams = leagueInfo?.settings?.playoff_teams || 6;
    const totalTeams   = allRosters.length || 12;

    const ranked = allRosters.map(roster => {
      const user      = users.find(u => u.user_id === roster.owner_id);
      const teamName  = user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
      const players   = (roster.players || []).map(id => PlayerDB.get(id)).filter(Boolean);
      const totalVal  = players.reduce((s, p) => s + Values.getByPlayer(p).avg, 0);
      const wins      = roster.settings?.wins   || 0;
      const losses    = roster.settings?.losses || 0;
      const pts       = roster.settings?.fpts   || 0;
      return { teamName, totalVal, wins, losses, pts, rosterId: roster.roster_id };
    });

    // Simple probability model: weighted combo of record + value
    const maxVal = Math.max(...ranked.map(r => r.totalVal)) || 1;
    const maxWin = Math.max(...ranked.map(r => r.wins)) || 1;

    const scored = ranked.map(r => {
      const valScore    = r.totalVal / maxVal;
      const recordScore = r.wins / (maxWin || 1);
      const score       = valScore * 0.6 + recordScore * 0.4;
      return { ...r, score };
    }).sort((a, b) => b.score - a.score);

    // Convert scores to probabilities
    const topN    = scored.slice(0, playoffTeams);
    const minProb = 0.05;
    const maxProb = 0.97;

    const withProbs = scored.map((t, i) => {
      let prob;
      if (i < playoffTeams) {
        prob = maxProb - (i / playoffTeams) * (maxProb - 0.55);
      } else {
        prob = minProb + ((playoffTeams - i) / (totalTeams - playoffTeams)) * 0.5 + 0.2;
        prob = Math.max(minProb, Math.min(0.45, prob));
      }
      return { ...t, prob };
    });

    container.innerHTML = withProbs.map(t => {
      const isMe  = t.rosterId === myRoster?.roster_id;
      const pct   = Math.round(t.prob * 100);
      const color = pct > 60 ? 'var(--green)' : pct > 30 ? 'var(--orange)' : 'var(--red)';
      return `
        <div class="pp-row">
          <span class="pp-name">${t.teamName} ${isMe ? '⚔️' : ''}</span>
          <div class="pp-bar-wrap">
            <div class="pp-bar" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="pp-pct" style="color:${color}">${pct}%</span>
        </div>`;
    }).join('');
  }

  function renderStandings(state) {
    const container = document.getElementById('standings-table');
    const { allRosters, users, myRoster } = state;

    const teams = allRosters.map(roster => {
      const user     = users.find(u => u.user_id === roster.owner_id);
      const teamName = user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
      return {
        teamName,
        wins:   roster.settings?.wins   || 0,
        losses: roster.settings?.losses || 0,
        ties:   roster.settings?.ties   || 0,
        pts:    Math.round(roster.settings?.fpts   || 0),
        ptsAgainst: Math.round(roster.settings?.fpts_against || 0),
        isMe: roster.roster_id === myRoster.roster_id,
      };
    }).sort((a, b) => b.wins - a.wins || b.pts - a.pts);

    const header = `
      <div class="st-row header">
        <span>#</span><span>Team</span>
        <span style="text-align:right">W-L</span>
        <span style="text-align:right">PF</span>
        <span style="text-align:right">PA</span>
      </div>`;

    const rows = teams.map((t, i) => `
      <div class="st-row ${t.isMe ? 'my-team-row' : ''}">
        <span class="st-pos">${i + 1}</span>
        <span class="st-name">${t.teamName} ${t.isMe ? '⚔️' : ''}</span>
        <span class="st-val">${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}</span>
        <span class="st-val">${t.pts}</span>
        <span class="st-val">${t.ptsAgainst}</span>
      </div>`).join('');

    container.innerHTML = header + rows;
  }

  return { render };
})();
