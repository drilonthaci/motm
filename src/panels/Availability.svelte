<script>
  import { app, setAvailability, applyTeams } from '../lib/store.svelte.js';
  import { balanceTeams, seasonTable } from '../lib/model.js';
  import Crest from '../lib/Crest.svelte';

  let { match } = $props();

  let table = $derived(seasonTable(app.matches, app.players));
  const ratingOf = (id) => table.find((r) => r.id === id)?.rating ?? null;

  let available = $derived(match.available ?? []);
  let unavailable = $derived(match.unavailable ?? []);

  let squad = $derived(app.players.filter((p) => p.active !== false));
  let waiting = $derived(
    squad.filter((p) => !available.includes(p.id) && !unavailable.includes(p.id))
  );
  let inPlayers = $derived(squad.filter((p) => available.includes(p.id)));

  let myAnswer = $derived(
    !app.meId ? null : available.includes(app.meId) ? 'in' : unavailable.includes(app.meId) ? 'out' : null
  );

  let preview = $derived(inPlayers.length >= 2 ? balanceTeams(inPlayers, ratingOf) : null);
  const named = $derived((match.lineupA?.length ?? 0) + (match.lineupB?.length ?? 0));
</script>

<section class="card" style="margin-bottom:16px">
  <div class="card-head">
    <h2>Who is playing?</h2>
    <span class="label">{inPlayers.length} in · {waiting.length} waiting</span>
  </div>

  <div class="card-body">
    {#if app.meId}
      <div class="avail-me">
        <span>Are you in?</span>
        <div class="row" style="gap:8px">
          <button
            class="btn sm" class:primary={myAnswer === 'in'}
            onclick={() => setAvailability(match.id, app.meId, true)}
          >I'm in</button>
          <button
            class="btn sm" class:danger={myAnswer === 'out'}
            onclick={() => setAvailability(match.id, app.meId, false)}
          >Can't make it</button>
        </div>
      </div>
    {:else}
      <p class="muted" style="font-size:13px; margin:0 0 14px">
        Tell us who you are on the Squad page to answer for yourself.
      </p>
    {/if}

    {#each [{ k: 'In', list: inPlayers, tone: 'in' }, { k: 'Out', list: squad.filter((p) => unavailable.includes(p.id)), tone: 'out' }, { k: 'No answer', list: waiting, tone: 'wait' }] as group}
      {#if group.list.length}
        <p class="label" style="margin:14px 0 7px">{group.k} · {group.list.length}</p>
        <div class="chips">
          {#each group.list as p (p.id)}
            <span class="avail-chip {group.tone}">{p.name}</span>
          {/each}
        </div>
      {/if}
    {/each}

    {#if preview}
      <div class="pick">
        <div class="pick-head">
          <span class="label">Suggested teams</span>
          <span class="label">
            strength {preview.strengthA.toFixed(1)} v {preview.strengthB.toFixed(1)}
          </span>
        </div>
        <div class="pick-grid">
          {#each ['A', 'B'] as side}
            <div class="pick-side">
              <div class="pick-side-head">
                <Crest {side} size={18} />
                {side === 'A' ? match.teamA?.name || 'Blacks' : match.teamB?.name || 'Whites'}
              </div>
              {#each preview[side] as p (p.id)}
                <span class="pick-name">
                  {p.name}
                  <i>{ratingOf(p.id) ? ratingOf(p.id).toFixed(1) : '-'}</i>
                </span>
              {/each}
            </div>
          {/each}
        </div>
        <button class="btn primary" style="margin-top:14px" onclick={() => applyTeams(match.id, preview)}>
          {named ? 'Replace the team sheet' : 'Use these teams'}
        </button>
        <p class="muted" style="font-size:12px; margin:10px 0 0">
          Balanced on season rating, keepers split first. Unrated players count as 6.5.
        </p>
      </div>
    {/if}
  </div>
</section>
