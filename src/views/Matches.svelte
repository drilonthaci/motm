<script>
  import { lockScroll } from '../lib/scrollLock.js';
  import Crest from '../lib/Crest.svelte';
  import Icon from '../lib/Icon.svelte';
  import { scoreOf, isPlayed, seasonTable, ratingColor, sideOfPlayer, motmOf } from '../lib/model.js';
  import { app, createMatch } from '../lib/store.svelte.js';
  import { go } from '../lib/router.svelte.js';
  import { dayNum, monthShort, dayName } from '../lib/dates.js';

  let creating = $state(false);
  let saving = $state(false);

  let form = $state({
    date: new Date().toISOString().slice(0, 10),
    time: '18:30',
    venue: 'Sports Arena · Pitch 2',
    homeName: 'Blacks',
    awayName: 'Whites'
  });

  let upcoming = $derived(app.matches.filter((m) => !isPlayed(m)));
  let played = $derived(app.matches.filter(isPlayed));

  const named = (m) => (m.lineupA?.length ?? 0) + (m.lineupB?.length ?? 0);
  const nameOf = (id) => app.players.find((p) => p.id === id)?.name ?? null;
  const shortName = (id) => {
    const full = nameOf(id);
    if (!full) return null;
    const parts = full.split(' ').filter(Boolean);
    return parts.length > 1 ? `${parts[0][0]}. ${parts.at(-1)}` : parts[0];
  };

  /* Cards alternate lime and violet down the page, soonest match first. */
  let tones = $derived(
    [...upcoming.slice().reverse(), ...played].reduce((map, m, i) => {
      map[m.id] = i % 2 === 0 ? 'lime' : 'violet';
      return map;
    }, {})
  );

  /* Most recent match that actually crowned someone. */
  let mvp = $derived((() => {
    let match = null;
    let motmId = null;
    for (const m of played) {
      const candidate = motmOf(m);
      if (candidate && app.players.some((p) => p.id === candidate)) {
        match = m;
        motmId = candidate;
        break;
      }
    }
    if (!match) return null;
    const player = app.players.find((p) => p.id === motmId);
    const stat = match.ratings?.[motmId];
    const season = seasonTable(app.matches, app.players).find((r) => r.id === player.id);
    const side = sideOfPlayer(match, player.id);
    return {
      player, match, side,
      squad: (side === 'A' ? match.teamA?.name : match.teamB?.name) || (side === 'A' ? 'Blacks' : 'Whites'),
      avg: stat?.avg ?? null,
      votes: stat?.count ?? 0,
      season
    };
  })());

  async function submit(event) {
    event.preventDefault();
    saving = true;
    const id = await createMatch({
      date: form.date,
      time: form.time,
      venue: form.venue.trim(),
      teamA: { name: form.homeName.trim() || 'Blacks', kit: 'black' },
      teamB: { name: form.awayName.trim() || 'Whites', kit: 'white' }
    });
    saving = false;
    if (id) {
      creating = false;
      go(`/match/${id}`);
    }
  }

  $effect(() => (creating) ? lockScroll() : undefined);
</script>

<div class="page-head">
  <h1>Matches</h1>
  <button class="btn primary" onclick={() => (creating = true)}>+ New match</button>
</div>

{#if !app.ready}
  <div class="card"><div class="emptystate"><p>Loading matches…</p></div></div>
{:else if !app.matches.length}
  <div class="card">
    <div class="emptystate">
      <div class="ico"><Icon name="calendar" /></div>
      <h3>No matches yet</h3>
      <p>Create the first one, split the lads into blacks and whites, then log the goals as they go in.</p>
      <button class="btn primary" style="margin-top:16px" onclick={() => (creating = true)}>Create a match</button>
    </div>
  </div>
{:else}
  {#if mvp}
    <a class="mvp" href="#/match/{mvp.match.id}/ratings">
      <span class="mvp-glow" aria-hidden="true"></span>
      {#if mvp.avg}
        <span class="mvp-num" aria-hidden="true">{mvp.avg.toFixed(1)}</span>
      {/if}

      <span class="mvp-head">
        <span class="mvp-tag">★ Latest MVP</span>
        <span class="mvp-date">{dayNum(mvp.match.date)} {monthShort(mvp.match.date)} <i>›</i></span>
      </span>

      <span class="mvp-id">
        <span class="mvp-av">
          {mvp.player.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
        </span>
        <span class="mvp-who">
          <b>{mvp.player.name}</b>
          <em>
            <Crest side={mvp.side === 'B' ? 'B' : 'A'} size={19} />
            {mvp.squad} · {mvp.player.position}
          </em>
        </span>
      </span>

      <span class="mvp-stats">
        <span>
          <small>Rating</small>
          <b style="color:{mvp.avg ? ratingColor(mvp.avg) : 'inherit'}">{mvp.avg ? mvp.avg.toFixed(1) : '-'}</b>
        </span>
        <span><small>Goals</small><b>{mvp.season?.goals ?? 0}</b></span>
        <span><small>Assists</small><b>{mvp.season?.assists ?? 0}</b></span>
        <span><small>MOTM</small><b>{mvp.season?.motm ?? 0}</b></span>
        <span><small>Votes</small><b>{mvp.votes}</b></span>
      </span>
    </a>
  {/if}

  {#each [{ title: 'Upcoming', list: upcoming }, { title: 'Results', list: played }] as group}
    {#if group.list.length}
      <div class="section-head">
        <h2>{group.title}</h2>
        <span class="label">{group.list.length}</span>
      </div>
      <div class="fxgrid">
        {#each group.list as match (match.id)}
          {@const s = scoreOf(match)}
          {@const live = !match.finished && (match.events?.length ?? 0) > 0}
          <a class="fxcard tone-{tones[match.id]}" href="#/match/{match.id}">
            <div class="fx-head">
              <span class="fx-when">{dayName(match.date)} {dayNum(match.date)} {monthShort(match.date)} · {match.time || 'TBC'}</span>
              {#if live}
                <span class="pill live">LIVE</span>
              {:else if match.finished}
                <span class="pill done">Full time</span>
              {:else}
                <span class="pill next">Upcoming</span>
              {/if}
            </div>

            <div class="fx-main">
              <div class="fx-team" class:beaten={match.finished && s.a < s.b}>
                <Crest side="A" size={44} />
                <b>{match.teamA?.name || 'Blacks'}</b>
              </div>
              <div class="fx-score">
                {#if match.finished || live}
                  <b>{s.a} <i>:</i> {s.b}</b>
                {:else}
                  <b class="vs">vs</b>
                {/if}
                {#if !match.finished && !live}
                  <small>KICK-OFF</small>
                {/if}
              </div>
              <div class="fx-team" class:beaten={match.finished && s.b < s.a}>
                <Crest side="B" size={44} />
                <b>{match.teamB?.name || 'Whites'}</b>
              </div>
            </div>

            <div class="fx-foot">
              {#if motmOf(match) && shortName(motmOf(match))}
                <span class="fx-mvp">★ {shortName(motmOf(match))}</span>
              {:else}
                <span>{match.venue || 'Venue TBC'}</span>
              {/if}
              <span>{named(match) ? `${named(match)} named` : 'No squads yet'}</span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {/each}
{/if}

{#if creating}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && (creating = false)}>
    <form class="modal" onsubmit={submit}>
      <button type="button" class="modal-x" onclick={() => (creating = false)} aria-label="Close">×</button>
      <h2>New match</h2>
      <p class="muted" style="font-size:13px; margin:6px 0 18px">
        Blacks against whites, 5 + 1 a side. You pick the squads next.
      </p>

      <div class="grid-2" style="gap:12px">
        <label class="field"><span>Date</span><input type="date" bind:value={form.date} required /></label>
        <label class="field"><span>Kick-off</span><input type="time" bind:value={form.time} required /></label>
      </div>
      <label class="field" style="margin-top:12px"><span>Venue</span>
        <input bind:value={form.venue} placeholder="Sports Arena · Pitch 2" />
      </label>
      <div class="grid-2" style="gap:12px; margin-top:12px">
        <label class="field"><span>Home squad (black)</span><input bind:value={form.homeName} autocapitalize="words" autocorrect="off" required /></label>
        <label class="field"><span>Away squad (white)</span><input bind:value={form.awayName} autocapitalize="words" autocorrect="off" required /></label>
      </div>

      <div class="row" style="margin-top:20px">
        <button class="btn primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create match'}</button>
        <button class="btn" type="button" onclick={() => (creating = false)}>Cancel</button>
      </div>
    </form>
  </div>
{/if}
