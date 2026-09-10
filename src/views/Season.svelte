<script>
  import { seasonTable, headToHead, isPlayed, scoreOf, ratingColor, leaderboard } from '../lib/model.js';
  import { app } from '../lib/store.svelte.js';
  import Icon from '../lib/Icon.svelte';

  let rows = $derived(seasonTable(app.matches, app.players));
  let h2h = $derived(headToHead(app.matches));
  let played = $derived(app.matches.filter(isPlayed));
  let totalGoals = $derived(played.reduce((n, m) => { const s = scoreOf(m); return n + s.a + s.b; }, 0));

  const initials = (full) =>
    full.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  /* Best average rating, most-rated player breaking ties. */
  let topRated = $derived(
    rows
      .filter((r) => r.rating != null)
      .sort((x, y) => y.rating - x.rating || y.ratingCount - x.ratingCount)
      .slice(0, 5)
  );

  let charts = $derived([
    {
      key: 'goals',
      title: 'Top scorers',
      unit: 'goals',
      suffix: (r) => `${r.apps} ${r.apps === 1 ? 'app' : 'apps'}`,
      rows: leaderboard(rows, 'goals'),
      value: (r) => r.goals
    },
    {
      key: 'assists',
      title: 'Top assists',
      unit: 'assists',
      suffix: (r) => `${r.apps} ${r.apps === 1 ? 'app' : 'apps'}`,
      rows: leaderboard(rows, 'assists'),
      value: (r) => r.assists
    },
    {
      key: 'rating',
      title: 'Top rated',
      unit: 'ratings',
      suffix: (r) => `${r.ratingCount} ${r.ratingCount === 1 ? 'vote' : 'votes'}`,
      rows: topRated,
      value: (r) => r.rating.toFixed(1)
    }
  ]);
</script>

<div class="page-head">
  <h1>Season</h1>
</div>

{#if !played.length}
  <div class="card">
    <div class="emptystate">
      <div class="ico"><Icon name="chart" /></div>
      <h3>Nothing to count yet</h3>
      <p>Mark a match as full time and it starts feeding these tables.</p>
    </div>
  </div>
{:else}
  <div class="statstrip">
    <div><small>Matches</small><b>{h2h.played}</b></div>
    <div><small>Goals</small><b>{totalGoals}</b></div>
    <div><small>Per match</small><b>{(totalGoals / played.length).toFixed(1)}</b></div>
    <div><small>Blacks</small><b>{h2h.aWins}</b></div>
    <div><small>Draws</small><b>{h2h.draws}</b></div>
    <div><small>Whites</small><b>{h2h.bWins}</b></div>
  </div>

  <div class="chartgrid">
    {#each charts as chart (chart.key)}
      {@const lead = chart.rows[0]}
      {@const rest = chart.rows.slice(1)}
      <section class="lb">
        <div class="lb-head">
          <h2>{chart.title}</h2>
        </div>

        {#if lead}
          <div class="lb-lead">
            <span class="lb-av">{initials(lead.name)}</span>
            <span class="lb-who">
              <b>{lead.name}</b>
              <small>{chart.suffix(lead)}</small>
            </span>
            <span class="lb-big">{chart.value(lead)}</span>
          </div>

          {#each rest as r, i (r.id)}
            <div class="lb-row">
              <span class="lb-rk">{i + 2}</span>
              <span class="lb-nm">{r.name}</span>
              <span class="lb-val">{chart.value(r)}</span>
            </div>
          {/each}
        {:else}
          <p class="lb-empty">No {chart.unit} recorded yet.</p>
        {/if}
      </section>
    {/each}
  </div>

  <div class="section-head">
    <h2>Player stats</h2>
    <span class="label">{rows.length} players</span>
  </div>
  <div class="card">
    <div class="statrow head">
      <span>Player</span>
      <span title="Goals">G</span>
      <span title="Assists">A</span>
      <span title="Player of the match">MOTM</span>
      <span title="Average rating">RTG</span>
    </div>
    {#each rows as r, i (r.id)}
      <div class="statrow">
        <span class="who">
          <i class="rk">{i + 1}</i>
          <span class="nm">
            {r.name}
            <small>{r.apps} {r.apps === 1 ? 'app' : 'apps'} · {r.position}</small>
          </span>
        </span>
        <span class="v" class:zero={!r.goals}>{r.goals}</span>
        <span class="v" class:zero={!r.assists}>{r.assists}</span>
        <span class="v" class:zero={!r.motm}>{r.motm}</span>
        <span class="v">
          {#if r.rating}
            <i class="rating" style="background:{ratingColor(r.rating)}">{r.rating.toFixed(1)}</i>
          {:else}
            <i class="rating none">-</i>
          {/if}
        </span>
      </div>
    {/each}
  </div>
{/if}
