<script>
  import { EVENT_TYPES, eventType, allSquad, sortedEvents, sideOfPlayer } from '../lib/model.js';
  import { app, patchMatch, say } from '../lib/store.svelte.js';
  import Crest from '../lib/Crest.svelte';
  import Icon from '../lib/Icon.svelte';

  let { match } = $props();

  /* Quick flow: tap the scorer, optionally tap the assist, add. The squad is
     inferred from the team sheet, so there is no dropdown for it. */
  let scorerId = $state('');
  let assistId = $state('');
  let minute = $state('');

  /* Everything rarer than a goal lives behind a disclosure. */
  let otherType = $state('own_goal');
  let otherTeam = $state('A');
  let otherPlayer = $state('');
  let otherMinute = $state('');

  const nameOf = (id) => app.players.find((p) => p.id === id)?.name ?? 'Unknown';
  const teamName = (side) =>
    (side === 'A' ? match.teamA?.name : match.teamB?.name) || (side === 'A' ? 'Blacks' : 'Whites');

  let squad = $derived(allSquad(match));
  const membersOf = (side) => squad.filter((s) => s.team === side);

  let scorerSide = $derived(scorerId ? sideOfPlayer(match, scorerId) : null);
  let teammates = $derived(squad.filter((s) => s.team === scorerSide && s.id !== scorerId));

  /* Running score attached to each goal, so the timeline reads like a story
     rather than a list of names. */
  let events = $derived((() => {
    let a = 0;
    let b = 0;
    return sortedEvents(match).map((e) => {
      const scored = e.type === 'goal' || e.type === 'own_goal';
      if (scored) e.team === 'A' ? (a += 1) : (b += 1);
      return { ...e, running: scored ? { a, b } : null };
    });
  })());

  function parseMinute(raw) {
    if (String(raw).trim() === '') return { ok: true, value: null };
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 200) return { ok: false };
    return { ok: true, value: Math.round(n) };
  }

  const push = (event) => patchMatch(match.id, { events: [...(match.events ?? []), event] });
  const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  function addGoal() {
    if (!scorerId) return say('Tap whoever scored first.');
    const m = parseMinute(minute);
    if (!m.ok) return say('Minute must be between 0 and 200, or left blank.');
    push({
      id: newId(),
      minute: m.value,
      type: 'goal',
      team: scorerSide,
      playerId: scorerId,
      assistId: assistId || null
    });
    say(`Goal for ${teamName(scorerSide)}: ${nameOf(scorerId)}.`);
    reset();
  }

  function reset() {
    scorerId = '';
    assistId = '';
    minute = '';
  }

  function addOther() {
    if (!otherPlayer) return say('Pick who it was.');
    const m = parseMinute(otherMinute);
    if (!m.ok) return say('Minute must be between 0 and 200, or left blank.');
    // For an own goal the credited side is the opponent of the scorer's side.
    const scoredBySide = sideOfPlayer(match, otherPlayer);
    const team = otherType === 'own_goal' ? (scoredBySide === 'A' ? 'B' : 'A') : scoredBySide;
    push({ id: newId(), minute: m.value, type: otherType, team, playerId: otherPlayer, assistId: null });
    otherPlayer = '';
    otherMinute = '';
  }

  const removeEvent = (id) =>
    patchMatch(match.id, { events: (match.events ?? []).filter((e) => e.id !== id) });

  const OTHER_TYPES = EVENT_TYPES.filter((t) => t.id !== 'goal');
</script>

{#if !squad.length}
  <div class="card">
    <div class="emptystate">
      <div class="ico"><Icon name="ball" /></div>
      <h3>Pick the squads first</h3>
      <p>Once players are named under Lineups, you can log goals here in two taps.</p>
    </div>
  </div>
{:else}
  <div class="card">
    <div class="card-head">
      <h2>Add a goal</h2>
      <span class="label">Two taps</span>
    </div>
    <div class="card-body">
      <p class="step"><b>1</b> Who scored?</p>
      {#each ['A', 'B'] as side}
        <div class="pickgroup">
          <span class="picklabel"><Crest {side} size={18} /> {teamName(side)}</span>
          <div class="chips">
            {#each membersOf(side) as s (s.id)}
              <button
                class:on={scorerId === s.id}
                onclick={() => { scorerId = s.id; assistId = ''; }}
              >{nameOf(s.id)}</button>
            {/each}
          </div>
        </div>
      {/each}

      {#if scorerId}
        <hr class="steprule" />
        <p class="step"><b>2</b> Who assisted? <em>optional</em></p>
        <div class="chips">
          <button class:on={assistId === ''} onclick={() => (assistId = '')}>No assist</button>
          {#each teammates as s (s.id)}
            <button class:on={assistId === s.id} onclick={() => (assistId = s.id)}>{nameOf(s.id)}</button>
          {/each}
        </div>

        <div class="addbar">
          <label class="field f-min">
            <span>Minute</span>
            <input type="number" min="0" max="200" bind:value={minute} placeholder="optional" />
          </label>
          <button class="btn primary" onclick={addGoal}>
            Add goal for {teamName(scorerSide)}
          </button>
          <button class="linkbtn" onclick={reset}>Clear</button>
        </div>
      {/if}
    </div>
  </div>

  <details class="othercard">
    <summary>Own goal, card or save</summary>
    <div class="card-body">
      <div class="row" style="align-items:flex-end">
        <label class="field f-sm">
          <span>What happened</span>
          <select bind:value={otherType}>
            {#each OTHER_TYPES as t}<option value={t.id}>{t.label}</option>{/each}
          </select>
        </label>
        <label class="field f-grow">
          <span>Player</span>
          <select bind:value={otherPlayer}>
            <option value="">Select...</option>
            {#each ['A', 'B'] as side}
              <optgroup label={teamName(side)}>
                {#each membersOf(side) as s (s.id)}<option value={s.id}>{nameOf(s.id)}</option>{/each}
              </optgroup>
            {/each}
          </select>
        </label>
        <label class="field f-min">
          <span>Minute</span>
          <input type="number" min="0" max="200" bind:value={otherMinute} placeholder="optional" />
        </label>
        <button class="btn f-add" onclick={addOther}>Add</button>
      </div>
      {#if otherType === 'own_goal'}
        <p class="muted" style="font-size:12.5px; margin:12px 0 0">
          Pick the player who put it in their own net. The goal is credited to the other squad.
        </p>
      {/if}
    </div>
  </details>
{/if}

{#if events.length}
  <div class="timeline">
    <p class="tl-cap"><span>Kick-off</span></p>
    {#each events as e (e.id)}
      {@const t = eventType(e.type)}
      <div class="tl-row">
        <div class="tl-item {e.team === 'A' ? 'left' : 'right'}">
          <span class="ev">
            {#if e.type === 'yellow' || e.type === 'red'}
              <i class="ev-card {e.type}"></i>
            {:else if e.type === 'save'}
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1.5l5.5 2v4.2c0 3.2-2.2 5.6-5.5 6.8-3.3-1.2-5.5-3.6-5.5-6.8V3.5L8 1.5z"
                  stroke="var(--text-2)" stroke-width="1.3" stroke-linejoin="round" />
              </svg>
            {:else}
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.6" fill={e.type === 'own_goal' ? 'none' : '#fff'}
                  stroke={e.type === 'own_goal' ? 'var(--red)' : 'none'} stroke-width="1.4" />
                <path d="M8 3.6l2.6 1.9-1 3.1H6.4l-1-3.1L8 3.6z" fill={e.type === 'own_goal' ? 'var(--red)' : '#111'} />
              </svg>
            {/if}
          </span>
          <Crest side={e.team} size={16} />
          <span class="txt">
            <b>{nameOf(e.playerId)}</b>
            <small>
              {t.label}{#if e.assistId}, assist by {nameOf(e.assistId)}{/if}
            </small>
          </span>
          {#if e.running}
            <span class="tl-score">{e.running.a}-{e.running.b}</span>
          {/if}
          <button class="tl-del" onclick={() => removeEvent(e.id)} aria-label="Delete this event">×</button>
        </div>
        {#if e.minute != null}
          <span class="tl-min">{e.minute}'</span>
        {:else}
          <span class="tl-min untimed" aria-label="No minute recorded"></span>
        {/if}
      </div>
    {/each}
    {#if match.finished}<p class="tl-cap"><span>Full time</span></p>{/if}
  </div>
{:else if squad.length}
  <div class="card" style="margin-top:16px">
    <div class="emptystate">
      <div class="ico"><Icon name="ball" /></div>
      <h3>No goals logged yet</h3>
      <p>Tap a scorer above. The scoreline and the season stats both build from what you log here.</p>
    </div>
  </div>
{/if}
