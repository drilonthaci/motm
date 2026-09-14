<script>
  import { app } from '../lib/store.svelte.js';
  import { seasonTable, playerMatches, ratingColor } from '../lib/model.js';
  import { go } from '../lib/router.svelte.js';
  import { dayNum, monthShort } from '../lib/dates.js';
  import Crest from '../lib/Crest.svelte';

  let { id } = $props();

  let player = $derived(app.players.find((p) => p.id === id));
  let stat = $derived(seasonTable(app.matches, app.players).find((r) => r.id === id));
  let history = $derived(playerMatches(app.matches, id));
  let form = $derived(history.slice(0, 5));

  const initials = (n) =>
    n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
</script>

{#if !player}
  <div class="card">
    <div class="emptystate">
      <h3>{app.ready ? 'No such player' : 'Loading...'}</h3>
      {#if app.ready}
        <button class="btn" style="margin-top:14px" onclick={() => go('/squad')}>Back to the squad</button>
      {/if}
    </div>
  </div>
{:else}
  <div class="page-head">
    <button class="btn sm" onclick={() => history.length ? go('/season') : go('/squad')}>← Back</button>
  </div>

  <section class="pp">
    <span class="pp-glow" aria-hidden="true"></span>
    <span class="pp-av">{initials(player.name)}</span>
    <div class="pp-id">
      <h1>{player.name}</h1>
      <p>{player.position}{#if player.active === false} · unavailable{/if}</p>
    </div>
    {#if stat?.rating}
      <span class="rating lg" style="background:{ratingColor(stat.rating)}">{stat.rating.toFixed(1)}</span>
    {/if}
  </section>

  <div class="pp-stats">
    <div><small>Apps</small><b>{stat?.apps ?? 0}</b></div>
    <div><small>Goals</small><b>{stat?.goals ?? 0}</b></div>
    <div><small>Assists</small><b>{stat?.assists ?? 0}</b></div>
    <div><small>MOTM</small><b>{stat?.motm ?? 0}</b></div>
    <div><small>W-D-L</small><b class="wdl">{stat?.won ?? 0}-{stat?.drawn ?? 0}-{stat?.lost ?? 0}</b></div>
  </div>

  {#if form.length}
    <div class="section-head"><h2>Form</h2><span class="label">Most recent first</span></div>
    <div class="form-row">
      {#each form as f (f.match.id)}
        <a class="form-dot {f.result}" href="#/match/{f.match.id}"
          title="{f.for}-{f.against} on {dayNum(f.match.date)} {monthShort(f.match.date)}">{f.result}</a>
      {/each}
    </div>
  {/if}

  {#if history.length}
    <div class="section-head"><h2>Matches</h2><span class="label">{history.length}</span></div>
    <div class="card">
      {#each history as h (h.match.id)}
        <a class="ph" href="#/match/{h.match.id}">
          <span class="ph-res {h.result}">{h.result}</span>
          <span class="ph-main">
            <b>{h.for} - {h.against}</b>
            <small>
              {dayNum(h.match.date)} {monthShort(h.match.date)} ·
              <Crest side={h.side} size={13} />
              {h.side === 'A' ? h.match.teamA?.name || 'Blacks' : h.match.teamB?.name || 'Whites'}
            </small>
          </span>
          <span class="ph-did">
            {#if h.goals}<i class="ph-tag">{h.goals} G</i>{/if}
            {#if h.assists}<i class="ph-tag">{h.assists} A</i>{/if}
            {#if h.motm}<i class="ph-tag motm">MOTM</i>{/if}
          </span>
          {#if h.rating}
            <span class="rating" style="background:{ratingColor(h.rating)}">{h.rating.toFixed(1)}</span>
          {:else}
            <span class="rating none">-</span>
          {/if}
        </a>
      {/each}
    </div>
  {:else}
    <div class="card" style="margin-top:14px">
      <div class="emptystate"><h3>No matches yet</h3><p>Stats appear once they have played a full match.</p></div>
    </div>
  {/if}
{/if}
