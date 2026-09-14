<script>
  import { app, setMyGoals } from '../lib/store.svelte.js';
  import { sideOfPlayer } from '../lib/model.js';

  let { match } = $props();

  const nameOf = (id) => app.players.find((p) => p.id === id)?.name ?? 'Unknown';

  let side = $derived(app.meId ? sideOfPlayer(match, app.meId) : null);
  let teammates = $derived(
    (side === 'A' ? match.lineupA : match.lineupB ?? [])
      ?.filter((s) => s.id !== app.meId) ?? []
  );

  /* What is already recorded for me, so the card reflects reality rather
     than starting blank every time. */
  let myGoals = $derived(
    (match.events ?? []).filter((e) => e.type === 'goal' && e.playerId === app.meId)
  );

  /* Local draft: one entry per goal, holding the assisting player id. */
  let draft = $state(null);
  let loadedFor = $state(null);

  $effect(() => {
    const key = `${match.id}:${myGoals.length}`;
    if (loadedFor === key) return;
    loadedFor = key;
    draft = myGoals.map((e) => e.assistId ?? '');
  });

  /* Answering "none" is still an answer, so an untouched card counts as
     unsaved until they confirm it. */
  let answered = $derived(app.reportedMatches.includes(match.id));
  let dirty = $derived(
    draft !== null &&
      (!answered ||
        draft.length !== myGoals.length ||
        draft.some((a, i) => (a || null) !== (myGoals[i]?.assistId ?? null)))
  );

  const setCount = (n) => {
    const next = (draft ?? []).slice(0, n);
    while (next.length < n) next.push('');
    draft = next;
  };

  const save = () => setMyGoals(match.id, app.meId, side, draft ?? []);
</script>

{#if side && draft}
  <section class="mine">
    <div class="mine-head">
      <h2>Did you score?</h2>
      <span class="label">Only you can remember this</span>
    </div>

    <div class="mine-body">
      <div class="count-row">
        {#each [0, 1, 2, 3, 4, 5] as n}
          <button class="count" class:on={draft.length === n} onclick={() => setCount(n)}>{n}</button>
        {/each}
      </div>

      {#if draft.length}
        <p class="label" style="margin:18px 0 9px">
          Who set {draft.length === 1 ? 'it' : 'them'} up?
        </p>
        {#each draft as assistId, i}
          <div class="assist-row">
            <span class="assist-n">Goal {i + 1}</span>
            <div class="chips">
              <button
                class:on={!assistId}
                onclick={() => (draft = draft.map((a, j) => (j === i ? '' : a)))}
              >Solo</button>
              {#each teammates as t (t.id)}
                <button
                  class:on={assistId === t.id}
                  onclick={() => (draft = draft.map((a, j) => (j === i ? t.id : a)))}
                >{nameOf(t.id)}</button>
              {/each}
            </div>
          </div>
        {/each}
      {/if}

      <button class="btn primary mine-save" onclick={save} disabled={!dirty}>
        {dirty ? 'Save my goals' : 'Saved'}
      </button>

      <p class="mine-note">
        Everyone fills in their own, so nobody has to remember the whole match.
      </p>
    </div>
  </section>
{/if}
