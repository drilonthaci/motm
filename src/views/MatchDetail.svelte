<script>
  import { lockScroll } from '../lib/scrollLock.js';
  import Crest from '../lib/Crest.svelte';
  import { scoreOf, derivedScore, scoreConflict, allSquad, ratingSummary, manOfTheMatch, ratingColor } from '../lib/model.js';
  import { app, patchMatch, deleteMatch, watchCards } from '../lib/store.svelte.js';
  import { go } from '../lib/router.svelte.js';
  import { longDate } from '../lib/dates.js';
  import Lineups from '../panels/Lineups.svelte';
  import Timeline from '../panels/Timeline.svelte';
  import Ratings from '../panels/Ratings.svelte';

  let { id, tab = 'lineups' } = $props();

  let editing = $state(false);
  let editingScore = $state(false);
  let confirmDelete = $state(false);
  let draftA = $state(0);
  let draftB = $state(0);

  let match = $derived(app.matches.find((m) => m.id === id));
  let score = $derived(match ? scoreOf(match) : { a: 0, b: 0 });
  let summary = $derived(ratingSummary(app.cards));
  let motm = $derived(manOfTheMatch(summary));
  let live = $derived(match && !match.finished && (match.events?.length ?? 0) > 0);
  let conflict = $derived(match ? scoreConflict(match) : null);

  function openScoreEditor() {
    draftA = score.a;
    draftB = score.b;
    editingScore = true;
  }

  function saveScore() {
    patchMatch(match.id, {
      manualScore: true,
      scoreA: Math.max(0, Math.round(Number(draftA) || 0)),
      scoreB: Math.max(0, Math.round(Number(draftB) || 0))
    });
    editingScore = false;
  }

  function useGoalLog() {
    patchMatch(match.id, { manualScore: false });
    editingScore = false;
  }

  $effect(() => watchCards(id));

  const nameOf = (pid) => app.players.find((p) => p.id === pid)?.name ?? 'Unknown';

  /** Goals per player, used for the ⚽ marks on the pitch and team sheet. */
  let goals = $derived((match?.events ?? []).reduce((acc, e) => {
    if (e.type === 'goal' && e.playerId) acc[e.playerId] = (acc[e.playerId] ?? 0) + 1;
    return acc;
  }, {}));

  /** "Krasniqi 2", programme style, grouped per scorer. */
  function scorerLines(side) {
    const tally = new Map();
    for (const e of match?.events ?? []) {
      if (e.team !== side) continue;
      if (e.type !== 'goal' && e.type !== 'own_goal') continue;
      const label = nameOf(e.playerId) + (e.type === 'own_goal' ? ' (og)' : '');
      tally.set(label, (tally.get(label) ?? 0) + 1);
    }
    return [...tally].map(([label, n]) => (n > 1 ? `${label} ${n}` : label));
  }

  const TABS = [
    { id: 'lineups', label: 'Lineups' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'ratings', label: 'Ratings' }
  ];

  $effect(() => (editing || editingScore) ? lockScroll() : undefined);
</script>

{#if !match}
  <div class="card">
    <div class="emptystate">
      <h3>{app.ready ? 'That match is gone' : 'Loading…'}</h3>
      {#if app.ready}<button class="btn" style="margin-top:14px" onclick={() => go('/')}>Back to matches</button>{/if}
    </div>
  </div>
{:else}
  <div class="page-head">
    <button class="btn sm" onclick={() => go('/')}>← Matches</button>
    <div class="row" style="gap:8px">
      <button class="btn sm" onclick={openScoreEditor}>Edit score</button>
      <button class="btn sm" onclick={() => (editing = true)}>Edit</button>
      <button
        class="btn sm"
        class:primary={!match.finished}
        onclick={() => patchMatch(match.id, { finished: !match.finished })}
      >{match.finished ? 'Reopen' : 'Mark full time'}</button>
    </div>
  </div>

  <div class="card">
    <div class="hero">
      <div class="hero-top">
        {#if live}<span class="pill live">LIVE</span>
        {:else if match.finished}<span class="pill done">Full time</span>
        {:else}<span class="pill next">Not started</span>{/if}
        <span class="label">{longDate(match.date)} · {match.time || '--:--'}</span>
      </div>

      <div class="hero-grid">
        <div class="hero-side">
          <Crest side="A" size={56} />
          <h2>{match.teamA?.name || 'Blacks'}</h2>
        </div>
        <div class="hero-score">
          <button class="score-btn" onclick={openScoreEditor} title="Edit the score">
            {score.a} <span class="dim">-</span> {score.b}
          </button>
          <span>5 + 1 · {match.venue || 'Venue TBC'}</span>
        </div>
        <div class="hero-side">
          <Crest side="B" size={56} />
          <h2>{match.teamB?.name || 'Whites'}</h2>
        </div>
      </div>

      {#if conflict}
        <p class="score-note">
          Score typed in by hand. The goals logged add up to {conflict.a}-{conflict.b}.
          <button class="linkbtn" onclick={useGoalLog}>Use the goal log instead</button>
        </p>
      {/if}

      {#if scorerLines('A').length || scorerLines('B').length}
        <div class="hero-scorers">
          <div>{#each scorerLines('A') as line}<div><b>{line}</b></div>{/each}</div>
          <div>{#each scorerLines('B') as line}<div><b>{line}</b></div>{/each}</div>
        </div>
      {/if}
    </div>
  </div>

  {#if motm}
    <div class="card" style="margin-top:12px">
      <div class="prow" style="border:0">
        <span class="label" style="width:auto">Player of the match</span>
        <span class="nm" style="text-align:right">{nameOf(motm.playerId)}</span>
        <span class="rating lg" style="background:{ratingColor(motm.avg)}">{motm.avg.toFixed(1)}</span>
      </div>
    </div>
  {/if}

  <div class="segtabs">
    {#each TABS as t}
      <button class:on={tab === t.id} onclick={() => go(`/match/${id}/${t.id}`)}>{t.label}</button>
    {/each}
  </div>

  {#if tab === 'lineups'}
    <Lineups {match} ratings={summary} {goals} />
  {:else if tab === 'timeline'}
    <Timeline {match} />
  {:else}
    <Ratings {match} />
  {/if}

  <div style="margin-top:30px; text-align:center">
    {#if confirmDelete}
      <div class="row" style="justify-content:center">
        <span class="muted" style="font-size:13px">Delete this match and its ratings?</span>
        <button class="btn sm danger" onclick={() => { deleteMatch(match.id); go('/'); }}>Yes, delete</button>
        <button class="btn sm" onclick={() => (confirmDelete = false)}>Cancel</button>
      </div>
    {:else}
      <button class="linkbtn" onclick={() => (confirmDelete = true)}>Delete this match</button>
    {/if}
  </div>
{/if}

{#if editingScore && match}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && (editingScore = false)}>
    <div class="modal" style="width:min(400px,100%)">
      <button class="modal-x" onclick={() => (editingScore = false)} aria-label="Close">×</button>
      <h2>Set the score</h2>
      <p class="muted" style="font-size:13px; margin:6px 0 18px">
        Type the result straight in when nobody remembers who scored.
      </p>

      <div class="score-edit">
        <label class="field">
          <span>{match.teamA?.name || 'Blacks'}</span>
          <input type="number" inputmode="numeric" min="0" bind:value={draftA} />
        </label>
        <em>-</em>
        <label class="field">
          <span>{match.teamB?.name || 'Whites'}</span>
          <input type="number" inputmode="numeric" min="0" bind:value={draftB} />
        </label>
      </div>

      <div class="row" style="margin-top:20px">
        <button class="btn primary" onclick={saveScore}>Save score</button>
        {#if match.manualScore}
          <button class="btn" onclick={useGoalLog}>Back to the goal log</button>
        {/if}
      </div>
      <p class="muted" style="font-size:12.5px; margin:14px 0 0">
        {#if match.manualScore}
          Currently manual. The goal log says {derivedScore(match).a}-{derivedScore(match).b}.
        {:else}
          Currently counted from the {(match.events ?? []).filter((e) => e.type === 'goal' || e.type === 'own_goal').length} goals logged. Saving switches this match to a manual score.
        {/if}
      </p>
    </div>
  </div>
{/if}

{#if editing && match}
  <div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && (editing = false)}>
    <div class="modal">
      <button class="modal-x" onclick={() => (editing = false)} aria-label="Close">×</button>
      <h2>Edit match</h2>
      <div class="grid-2" style="gap:12px; margin-top:16px">
        <label class="field"><span>Date</span>
          <input type="date" value={match.date} onchange={(e) => patchMatch(match.id, { date: e.currentTarget.value })} />
        </label>
        <label class="field"><span>Kick-off</span>
          <input type="time" value={match.time} onchange={(e) => patchMatch(match.id, { time: e.currentTarget.value })} />
        </label>
      </div>
      <label class="field" style="margin-top:12px"><span>Venue</span>
        <input value={match.venue ?? ''} onchange={(e) => patchMatch(match.id, { venue: e.currentTarget.value })} />
      </label>
      <div class="grid-2" style="gap:12px; margin-top:12px">
        <label class="field"><span>Home squad (black)</span>
          <input value={match.teamA?.name ?? ''}
            onchange={(e) => patchMatch(match.id, { teamA: { ...match.teamA, name: e.currentTarget.value } })} />
        </label>
        <label class="field"><span>Away squad (white)</span>
          <input value={match.teamB?.name ?? ''}
            onchange={(e) => patchMatch(match.id, { teamB: { ...match.teamB, name: e.currentTarget.value } })} />
        </label>
      </div>
      <button class="btn primary" style="margin-top:20px" onclick={() => (editing = false)}>Done</button>
    </div>
  </div>
{/if}
