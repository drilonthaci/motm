<script>
  import Crest from '../lib/Crest.svelte';
  import Icon from '../lib/Icon.svelte';
  import { allSquad, ratingSummary, manOfTheMatch, ratingColor, startersOf, benchOf } from '../lib/model.js';
  import { app, submitCard } from '../lib/store.svelte.js';

  let { match } = $props();

  let squad = $derived(allSquad(match));
  let summary = $derived(ratingSummary(app.cards));
  let motm = $derived(manOfTheMatch(summary));
  let myCard = $derived(app.cards.find((c) => c.uid === app.uid));

  /* Local scratch card so dragging a slider never round-trips to Firestore. */
  let scores = $state({});
  let loadedFor = $state(null);
  $effect(() => {
    const key = `${match.id}:${myCard ? 'has' : 'none'}`;
    if (loadedFor === key) return;
    loadedFor = key;
    scores = { ...(myCard?.scores ?? {}) };
  });

  const nameOf = (id) => app.players.find((p) => p.id === id)?.name ?? 'Unknown';
  const teamName = (side) =>
    (side === 'A' ? match.teamA?.name : match.teamB?.name) || (side === 'A' ? 'Blacks' : 'Whites');

  let rated = $derived(Object.values(scores).filter((v) => Number(v) > 0).length);
  /* You are never on your own card, so the total excludes you. */
  let rateable = $derived(squad.filter((s) => s.id !== app.meId).length);

  const clear = (id) => {
    const next = { ...scores };
    delete next[id];
    scores = next;
  };

  let ranked = $derived(
    squad
      .map((s) => ({ ...s, stat: summary[s.id] }))
      .sort((x, y) => (y.stat?.avg ?? -1) - (x.stat?.avg ?? -1))
  );
</script>

{#if motm}
  <div class="motm" style="margin-bottom:16px">
    <Crest side={squad.find((s) => s.id === motm.playerId)?.team === 'B' ? 'B' : 'A'} size={38} />
    <div class="txt">
      <span class="label">Player of the match</span>
      <h2>{nameOf(motm.playerId)}</h2>
      <span style="font-size:12.5px; opacity:.7">
        Rated by {motm.count} {motm.count === 1 ? 'person' : 'people'}
      </span>
    </div>
    <span class="big">{motm.avg.toFixed(1)}</span>
  </div>
{/if}

{#if !squad.length}
  <div class="card">
    <div class="emptystate">
      <div class="ico"><Icon name="squad" /></div>
      <h3>No team sheet yet</h3>
      <p>Name the two squads under Lineups and the rating card builds itself.</p>
    </div>
  </div>
{:else}
  <div class="grid-2" style="align-items:start">
    <section class="card">
      <div class="card-head">
        <h2>Your card</h2>
        <span class="label">{rated}/{rateable} rated</span>
      </div>

      {#each ['A', 'B'] as side}
        {@const members = [...startersOf(match, side), ...benchOf(match, side)]}
        {#if members.length}
          <div class="sheet-head">
            <Crest {side} size={22} />
            {teamName(side)}
          </div>
          {#each members as s (s.id)}
            {#if s.id === app.meId}
              <div class="rrow rate is-you">
                <span class="nm">
                  {nameOf(s.id)}
                  <small>{s.bench ? `${s.pos} · reserve` : s.pos}</small>
                </span>
                <span class="you-tag">You</span>
              </div>
            {:else}
            <div class="rrow rate">
              <span class="nm">
                {nameOf(s.id)}
                <small>{s.bench ? `${s.pos} · reserve` : s.pos}</small>
              </span>
              <input
                type="range" min="1" max="10" step="0.5"
                value={scores[s.id] ?? 6}
                oninput={(e) => (scores = { ...scores, [s.id]: Number(e.currentTarget.value) })}
              />
              {#if scores[s.id]}
                <button
                  class="rating" style="background:{ratingColor(scores[s.id])}; border:0; cursor:pointer"
                  onclick={() => clear(s.id)} title="Clear this rating"
                >{Number(scores[s.id]).toFixed(1)}</button>
              {:else}
                <span class="rating none">-</span>
              {/if}
            </div>
            {/if}
          {/each}
        {/if}
      {/each}

      <div style="padding:14px">
        <button class="btn primary" onclick={() => submitCard(match.id, scores)}>
          {myCard ? 'Update my ratings' : 'Submit ratings'}
        </button>
        <p class="muted" style="font-size:12.5px; margin:10px 0 0">
          Leave anyone you did not see blank - blanks are ignored, not counted as zero.
        </p>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>Average rating</h2>
        <span class="label">{app.cards.length} {app.cards.length === 1 ? 'card' : 'cards'} in</span>
      </div>
      {#each ranked as s, i (s.id)}
        <div class="rrow" style="grid-template-columns:26px 1fr 46px">
          <span class="label num">{i + 1}</span>
          <div class="nm">
            {nameOf(s.id)}
            <small>{s.stat ? `${teamName(s.team)} · ${s.stat.count} ${s.stat.count === 1 ? 'vote' : 'votes'}` : teamName(s.team)}</small>
            {#if s.stat}
              <div class="avg-bar">
                <i style="width:{(s.stat.avg / 10) * 100}%; background:{ratingColor(s.stat.avg)}"></i>
              </div>
            {/if}
          </div>
          {#if s.stat}
            <span class="rating" style="background:{ratingColor(s.stat.avg)}">{s.stat.avg.toFixed(1)}</span>
          {:else}
            <span class="rating none">-</span>
          {/if}
        </div>
      {/each}
      {#if !app.cards.length}
        <p class="muted" style="padding:14px; margin:0; font-size:13px">
          No cards submitted yet. Yours will be the first.
        </p>
      {/if}
    </section>
  </div>
{/if}
