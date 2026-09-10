<script>
  import { POSITIONS, seasonTable, ratingColor } from '../lib/model.js';
  import { app, addPlayer, updatePlayer, removePlayer, claimPlayer } from '../lib/store.svelte.js';
  import Icon from '../lib/Icon.svelte';

  let name = $state('');
  let position = $state('MID');
  let openMenu = $state(null);
  /* Deleting a player is irreversible and wipes them from every past
     team sheet, so it always takes a second tap. */
  let confirmingRemove = $state(null);

  const initials = (full) =>
    full.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  let stats = $derived(seasonTable(app.matches, app.players));
  const statFor = (id) => stats.find((r) => r.id === id);

  function submit(event) {
    event.preventDefault();
    addPlayer({ name, position });
    name = '';
  }

  const act = (fn) => { fn(); openMenu = null; confirmingRemove = null; };

  let grouped = $derived(
    POSITIONS.map((pos) => ({ pos, list: app.players.filter((p) => (p.position || 'MID') === pos) }))
      .filter((g) => g.list.length)
  );
</script>

<svelte:window
  onclick={() => { openMenu = null; confirmingRemove = null; }}
  onkeydown={(e) => e.key === 'Escape' && (openMenu = null, confirmingRemove = null)}
/>

<div class="page-head">
  <h1>Squad</h1>
  <div class="row" style="gap:10px">
    <span class="label">{app.players.length} {app.players.length === 1 ? 'player' : 'players'}</span>
    {#if app.meId}
      <span class="you-chip" title="Locked so nobody can switch identity to rate themselves">
        You: {app.players.find((p) => p.id === app.meId)?.name ?? 'unknown'}
      </span>
    {:else}
      <button class="btn sm" onclick={() => claimPlayer(undefined)}>Set who you are</button>
    {/if}
  </div>
</div>

<div class="split-aside">
  <div>
    {#if !app.players.length}
      <div class="card">
        <div class="emptystate">
          <div class="ico"><Icon name="player" /></div>
          <h3>Nobody on the books</h3>
          <p>Add everyone who turns up. You do this once, then they are pickable in every match.</p>
        </div>
      </div>
    {/if}

    {#each grouped as group}
      <div class="section-head"><h2>{group.pos}</h2><span class="label">{group.list.length}</span></div>
      <div class="card">
        {#each group.list as player (player.id)}
          {@const s = statFor(player.id)}
          <div class="rp" class:inactive={player.active === false}>
            <span class="pav">{initials(player.name)}</span>

            <span class="rp-name">{player.name}</span>

            <span class="rp-meta">
              <i class="rp-pos">{player.position || 'MID'}</i>
              <span class="rp-stats">
                {#if s}
                  {s.apps} {s.apps === 1 ? 'app' : 'apps'} · {s.goals} G · {s.assists} A
                {:else}
                  No matches yet
                {/if}
              </span>
              {#if s?.rating}
                <span class="rating" style="background:{ratingColor(s.rating)}">{s.rating.toFixed(1)}</span>
              {:else}
                <span class="rating none">-</span>
              {/if}
            </span>

            <span class="rp-actions">
              <button
                class="rowmenu-btn"
                aria-label="Options for {player.name}"
                aria-expanded={openMenu === player.id}
                onclick={(e) => { e.stopPropagation(); openMenu = openMenu === player.id ? null : player.id; }}
              >Options</button>

              {#if openMenu === player.id}
                <div class="rowmenu" role="menu">
                  <p class="rowmenu-label">Position</p>
                  <div class="menu-pos">
                    {#each POSITIONS as p}
                      <button
                        class:on={(player.position || 'MID') === p}
                        onclick={() => act(() => updatePlayer(player.id, { position: p }))}
                      >{p}</button>
                    {/each}
                  </div>
                  <hr class="rowmenu-rule" />
                  <button
                    role="menuitem"
                    onclick={() => act(() => updatePlayer(player.id, { active: player.active === false }))}
                  >
                    {player.active === false ? 'Mark as available' : 'Mark as unavailable'}
                  </button>
                  {#if confirmingRemove === player.id}
                    <button
                      role="menuitem"
                      class="danger"
                      onclick={() => act(() => removePlayer(player.id))}
                    >Yes, remove {player.name.split(' ')[0]}</button>
                    <button role="menuitem" onclick={(e) => { e.stopPropagation(); confirmingRemove = null; }}>
                      Keep them
                    </button>
                  {:else}
                    <button
                      role="menuitem"
                      class="danger"
                      onclick={(e) => { e.stopPropagation(); confirmingRemove = player.id; }}
                    >Remove from squad</button>
                  {/if}
                </div>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <form class="card" onsubmit={submit}>
    <div class="card-head"><h2>Add a player</h2></div>
    <div class="card-body">
      <label class="field"><span>Full name</span>
        <input
          bind:value={name}
          placeholder="Player name"
          autocapitalize="words"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="done"
          required
        />
      </label>
      <label class="field" style="margin-top:12px"><span>Usual position</span>
        <select bind:value={position}>{#each POSITIONS as p}<option value={p}>{p}</option>{/each}</select>
      </label>
      <button class="btn primary" style="margin-top:16px; width:100%; justify-content:center" type="submit">
        Add to squad
      </button>
      <p class="muted" style="font-size:12.5px; margin:12px 0 0">
        Position is only the default when you name them. You can move anyone anywhere on the team sheet.
      </p>
    </div>
  </form>
</div>
