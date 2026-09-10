<script>
  import Icon from '../lib/Icon.svelte';
  import { seasonTable, headToHead, isPlayed, scoreOf, ratingColor, leaderboard } from '../lib/model.js';
  import { app } from '../lib/store.svelte.js';

  let rows = $derived(seasonTable(app.matches, app.players));
  let h2h = $derived(headToHead(app.matches));
  let played = $derived(app.matches.filter(isPlayed));
  let totalGoals = $derived(played.reduce((n, m) => { const s = scoreOf(m); return n + s.a + s.b; }, 0));

  let charts = $derived([
    { key: 'goals', title: 'Top scorers', unit: 'goals', rows: leaderboard(rows, 'goals') },
    { key: 'assists', title: 'Top assists', unit: 'assists', rows: leaderboard(rows, 'assists') }
  ]);

  /* Best average rating across the season, most-rated player breaking ties. */
  let topRated = $derived(
    rows
      .filter((r) => r.rating != null)
      .sort((x, y) => y.rating - x.rating || y.ratingCount - x.ratingCount)
      .slice(0, 5)
  );
</script>

<div class="page-head">
  <h1>Season</h1>
  <span class="label">{played.length} played · {totalGoals} goals</span>
</div>

{#if !played.length}
  <div class="card">
    <div class="emptystate">
      <div class="ico"><Icon name="chart" /></div>
      <h3>Nothing to count yet</h3>
      <p>Mark a match as full time and it starts feeding this table.</p>
    </div>
  </div>
{:else}
  <div class="grid-3">
    <div class="stat-tile"><span class="label">Matches</span><b>{h2h.played}</b></div>
    <div class="stat-tile"><span class="label">Goals / match</span><b>{(totalGoals / played.length).toFixed(1)}</b></div>
    <div class="stat-tile"><span class="label">B / D / W</span><b>{h2h.aWins}·{h2h.draws}·{h2h.bWins}</b></div>
  </div>

  <div class="chartgrid">
    {#each charts as chart (chart.key)}
      {@const top = chart.rows[0]?.[chart.key] ?? 1}
      <section class="card">
        <div class="card-head">
          <h2>{chart.title}</h2>
          <span class="label">Season</span>
        </div>
        {#each chart.rows as r, i (r.id)}
          <div class="lrow">
            <span class="rk">{i + 1}</span>
            <span class="nm">
              {r.name}
              <small>{r.apps} {r.apps === 1 ? 'app' : 'apps'}</small>
            </span>
            <span class="tot">{r[chart.key]}</span>
            <span class="lbar"><i style="width:{(r[chart.key] / top) * 100}%"></i></span>
          </div>
        {:else}
          <p class="muted" style="padding:16px; margin:0; font-size:13px">
            No {chart.unit} logged yet. Add them under a match's Timeline tab.
          </p>
        {/each}
      </section>
    {/each}

    <section class="card">
      <div class="card-head">
        <h2>Top rated</h2>
        <span class="label">Average</span>
      </div>
      {#each topRated as r, i (r.id)}
        <div class="lrow">
          <span class="rk">{i + 1}</span>
          <span class="nm">
            {r.name}
            <small>{r.ratingCount} {r.ratingCount === 1 ? 'vote' : 'votes'} · {r.apps} {r.apps === 1 ? 'app' : 'apps'}</small>
          </span>
          <span class="rating" style="background:{ratingColor(r.rating)}">{r.rating.toFixed(1)}</span>
          <span class="lbar"><i style="width:{(r.rating / 10) * 100}%; background:{ratingColor(r.rating)}"></i></span>
        </div>
      {:else}
        <p class="muted" style="padding:16px; margin:0; font-size:13px">
          Nobody rated yet. Open a match and submit a rating card.
        </p>
      {/each}
    </section>
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
