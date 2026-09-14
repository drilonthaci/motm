<script>
  import Icon from '../lib/Icon.svelte';
  import { app, setMyGoals } from '../lib/store.svelte.js';
  import { sideOfPlayer } from '../lib/model.js';

  let { match } = $props();

  const nameOf = (id) => app.players.find((p) => p.id === id)?.name ?? 'Unknown';

  let side = $derived(app.meId ? sideOfPlayer(match, app.meId) : null);
  let teammates = $derived(
    ((side === 'A' ? match.lineupA : match.lineupB) ?? []).filter((s) => s.id !== app.meId)
  );

  /* What is already recorded for me, so the card reflects reality rather
     than starting blank every time. */
  let myGoals = $derived(
    (match.events ?? []).filter((e) => e.type === 'goal' && e.playerId === app.meId)
  );

  /* Local draft: one entry per goal, holding the assisting player id. */
  let draft = $state(null);
  let loadedFor = $state(null);
  /* Which goal's assist picker is expanded. Only one at a time, so a hat
     trick is three short rows rather than three walls of chips. */
  let open = $state(-1);

  $effect(() => {
    const key = `${match.id}:${myGoals.length}`;
    if (loadedFor === key) return;
    loadedFor = key;
    draft = myGoals.map((e) => e.assistId ?? '');
    open = -1;
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
    n = Math.max(0, Math.min(30, n));
    const next = (draft ?? []).slice(0, n);
    while (next.length < n) next.push('');
    draft = next;
    // A newly added goal opens its picker; removing one closes whatever was open.
    open = n > (draft?.length ?? 0) - 1 ? n - 1 : -1;
    if (n > 0 && next.length === n) open = n - 1;
  };

  const pick = (i, id) => {
    draft = draft.map((a, j) => (j === i ? id : a));
    open = -1;
  };

  const save = () => setMyGoals(match.id, app.meId, side, draft ?? []);
</script>

{#if side && draft}
  <section class="card mine">
    <div class="card-head">
      <h2>Did you score?</h2>
      <button class="btn sm mine-save" class:primary={dirty} onclick={save} disabled={!dirty}>
        {dirty ? 'Save' : 'Saved'}
      </button>
    </div>

    <div class="tally" role="group" aria-label="How many goals you scored">
      <button class="tally-btn" onclick={() => setCount(draft.length - 1)} disabled={draft.length === 0} aria-label="One fewer">
        <Icon name="minus" size={20} />
      </button>
      <div class="tally-n" aria-live="polite">
        <b class:zero={draft.length === 0}>{draft.length}</b>
        <small>{draft.length === 1 ? 'goal' : 'goals'}</small>
      </div>
      <button class="tally-btn plus" onclick={() => setCount(draft.length + 1)} disabled={draft.length >= 30} aria-label="One more">
        <Icon name="plus" size={20} />
      </button>
    </div>

    {#if draft.length}
      <div class="goals">
        {#each draft as assistId, i}
          <div class="goal" class:open={open === i}>
            <button class="goal-row" onclick={() => (open = open === i ? -1 : i)} aria-expanded={open === i}>
              <span class="goal-ball" aria-hidden="true"><Icon name="ball" size={14} /></span>
              <span class="goal-name">Goal {i + 1}</span>
              <span class="goal-assist" class:set={Boolean(assistId)}>
                {assistId ? `Assist ${nameOf(assistId)}` : 'Solo'}
              </span>
              <span class="goal-chev"><Icon name="chevron" size={18} /></span>
            </button>

            {#if open === i}
              <div class="goal-pick">
                <p class="label" style="margin:0 0 8px">Who set it up?</p>
                <div class="chips">
                  <button class:on={!assistId} onclick={() => pick(i, '')}>Solo</button>
                  {#each teammates as t (t.id)}
                    <button class:on={assistId === t.id} onclick={() => pick(i, t.id)}>{nameOf(t.id)}</button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

  </section>
{/if}
