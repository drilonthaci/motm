<script>
  import Crest from '../lib/Crest.svelte';
  import { POSITIONS, STARTERS, MAX_BENCH, startersOf, benchOf, ratingColor } from '../lib/model.js';
  import { app, patchMatch, say } from '../lib/store.svelte.js';
  import Pitch from '../lib/Pitch.svelte';

  let { match, ratings = {}, goals = {} } = $props();

  const byId = (id) => app.players.find((p) => p.id === id);
  const key = (side) => (side === 'A' ? 'lineupA' : 'lineupB');

  let assigned = $derived(new Set([
    ...(match.lineupA ?? []).map((s) => s.id),
    ...(match.lineupB ?? []).map((s) => s.id)
  ]));
  let available = $derived(app.players.filter((p) => p.active !== false && !assigned.has(p.id)));

  function add(side, player) {
    const slots = match[key(side)] ?? [];
    const starters = slots.filter((s) => !s.bench).length;
    const bench = slots.length - starters;
    if (starters >= STARTERS && bench >= MAX_BENCH) {
      return say(`That squad is full - ${STARTERS} on the pitch and ${MAX_BENCH} in reserve.`);
    }
    const onBench = starters >= STARTERS;
    patchMatch(match.id, {
      [key(side)]: [...slots, { id: player.id, pos: player.position || 'MID', bench: onBench }]
    });
  }

  function drop(side, id) {
    patchMatch(match.id, { [key(side)]: (match[key(side)] ?? []).filter((s) => s.id !== id) });
  }

  function cyclePosition(side, id) {
    patchMatch(match.id, {
      [key(side)]: (match[key(side)] ?? []).map((s) =>
        s.id === id ? { ...s, pos: POSITIONS[(POSITIONS.indexOf(s.pos) + 1) % POSITIONS.length] } : s
      )
    });
  }

  function toggleBench(side, id) {
    const slots = match[key(side)] ?? [];
    const slot = slots.find((s) => s.id === id);
    if (!slot) return;
    if (slot.bench && startersOf(match, side).length >= STARTERS) {
      return say(`Already ${STARTERS} on the pitch. Bench someone first.`);
    }
    if (!slot.bench && benchOf(match, side).length >= MAX_BENCH) {
      return say(`Only ${MAX_BENCH} reserves allowed.`);
    }
    patchMatch(match.id, {
      [key(side)]: slots.map((s) => (s.id === id ? { ...s, bench: !s.bench } : s))
    });
  }

  function swapSide(from, id) {
    const to = from === 'A' ? 'B' : 'A';
    const slot = (match[key(from)] ?? []).find((s) => s.id === id);
    if (!slot) return;
    const target = match[key(to)] ?? [];
    if (target.length >= STARTERS + MAX_BENCH) return say('The other squad is full.');
    patchMatch(match.id, {
      [key(from)]: (match[key(from)] ?? []).filter((s) => s.id !== id),
      [key(to)]: [...target, { ...slot, bench: target.filter((s) => !s.bench).length >= STARTERS }]
    });
  }

  /* One row menu open at a time, keyed by "side:playerId". */
  let openMenu = $state(null);
  const menuKey = (side, id) => `${side}:${id}`;
  const act = (fn) => { fn(); openMenu = null; };
  const squadName = (side) =>
    (side === 'A' ? match.teamA?.name : match.teamB?.name) || (side === 'A' ? 'Blacks' : 'Whites');

  const ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const sorted = (list) => [...list].sort((x, y) => (ORDER[x.pos] ?? 9) - (ORDER[y.pos] ?? 9));
</script>

<svelte:window
  onclick={() => (openMenu = null)}
  onkeydown={(e) => e.key === 'Escape' && (openMenu = null)}
/>

<Pitch {match} players={app.players} {ratings} {goals} />

<div class="grid-2" style="margin-top:16px; align-items:start">
  {#each ['A', 'B'] as side}
    {@const team = side === 'A' ? match.teamA : match.teamB}
    {@const starters = sorted(startersOf(match, side))}
    {@const bench = sorted(benchOf(match, side))}
    <section class="card">
      <div class="sheet-head">
        <Crest {side} size={24} />
        {team?.name || (side === 'A' ? 'Blacks' : 'Whites')}
        <span class="count">{starters.length}/{STARTERS} + {bench.length}</span>
      </div>

      {#each starters as slot (slot.id)}
        {@const player = byId(slot.id)}
        {@const r = ratings[slot.id]}
        <div class="prow">
          <button class="pos" onclick={() => cyclePosition(side, slot.id)} title="Change position">{slot.pos}</button>
          <span class="nm">
            {player?.name ?? 'Removed player'}
            {#if goals[slot.id]}<small>⚽ {goals[slot.id]}</small>{/if}
          </span>
          {#if r}
            <span class="rating" style="background:{ratingColor(r.avg)}">{r.avg.toFixed(1)}</span>
          {:else}
            <span class="rating none">-</span>
          {/if}
          <span class="prow-actions">
            <button
              class="rowmenu-btn"
              aria-label="Options for {player?.name ?? 'player'}"
              aria-expanded={openMenu === menuKey(side, slot.id)}
              onclick={(e) => { e.stopPropagation(); openMenu = openMenu === menuKey(side, slot.id) ? null : menuKey(side, slot.id); }}
            >Options</button>
            {#if openMenu === menuKey(side, slot.id)}
              <div class="rowmenu" role="menu">
                <button role="menuitem" onclick={() => act(() => toggleBench(side, slot.id))}>
                  Move to the bench
                </button>
                <button role="menuitem" onclick={() => act(() => swapSide(side, slot.id))}>
                  Move to {squadName(side === 'A' ? 'B' : 'A')}
                </button>
                <button role="menuitem" class="danger" onclick={() => act(() => drop(side, slot.id))}>
                  Remove from match
                </button>
              </div>
            {/if}
          </span>
        </div>
      {:else}
        <p class="muted" style="padding:14px; margin:0; font-size:13px">
          Nobody named yet. Pick six from the roster below.
        </p>
      {/each}

      {#if bench.length}
        <div class="sheet-head" style="border-top:1px solid var(--line)">
          Reserves <span class="count">{bench.length}/{MAX_BENCH}</span>
        </div>
        {#each bench as slot (slot.id)}
          {@const player = byId(slot.id)}
          <div class="prow">
            <button class="pos" onclick={() => cyclePosition(side, slot.id)}>{slot.pos}</button>
            <span class="nm muted">{player?.name ?? 'Removed player'}</span>
            <span class="rating none">-</span>
            <span class="prow-actions">
              <button
                class="rowmenu-btn"
                aria-label="Options for {player?.name ?? 'player'}"
                aria-expanded={openMenu === menuKey(side, slot.id)}
                onclick={(e) => { e.stopPropagation(); openMenu = openMenu === menuKey(side, slot.id) ? null : menuKey(side, slot.id); }}
              >Options</button>
              {#if openMenu === menuKey(side, slot.id)}
                <div class="rowmenu" role="menu">
                  <button role="menuitem" onclick={() => act(() => toggleBench(side, slot.id))}>
                    Move into the starting six
                  </button>
                  <button role="menuitem" onclick={() => act(() => swapSide(side, slot.id))}>
                    Move to {squadName(side === 'A' ? 'B' : 'A')}
                  </button>
                  <button role="menuitem" class="danger" onclick={() => act(() => drop(side, slot.id))}>
                    Remove from match
                  </button>
                </div>
              {/if}
            </span>
          </div>
        {/each}
      {/if}

      <div style="padding:14px">
        <p class="label" style="margin:0 0 8px">Add to this squad</p>
        <div class="chips">
          {#each available as player (player.id)}
            <button onclick={() => add(side, player)}>{player.name} <i>{player.position}</i></button>
          {:else}
            <span class="muted" style="font-size:13px">
              {app.players.length ? 'Everyone available is already named.' : 'The roster is empty - add players in the Squad tab.'}
            </span>
          {/each}
        </div>
      </div>
    </section>
  {/each}
</div>
