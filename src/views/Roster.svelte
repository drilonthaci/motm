<script>
  import Icon from '../lib/Icon.svelte';
  import { POSITIONS, seasonTable, ratingColor } from '../lib/model.js';
  import { app, addPlayer, updatePlayer, removePlayer } from '../lib/store.svelte.js';

  let name = $state('');
  let position = $state('MID');
  let confirming = $state(null);

  const initials = (full) =>
    full.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  let stats = $derived(seasonTable(app.matches, app.players));
  const statFor = (id) => stats.find((r) => r.id === id);

  function submit(event) {
    event.preventDefault();
    addPlayer({ name, position });
    name = '';
  }

  let grouped = $derived(
    POSITIONS.map((pos) => ({ pos, list: app.players.filter((p) => (p.position || 'MID') === pos) }))
      .filter((g) => g.list.length)
  );
</script>

<div class="page-head">
  <h1>Squad</h1>
  <span class="label">{app.players.length} {app.players.length === 1 ? 'player' : 'players'}</span>
</div>

<div class="split-aside">
  <div>
    {#if !app.players.length}
      <div class="card">
        <div class="emptystate">
          <div class="ico"><Icon name="player" /></div>
          <h3>Nobody on the books</h3>
          <p>Add everyone who turns up. You do this once - after that they are pickable in every match.</p>
        </div>
      </div>
    {/if}

    {#each grouped as group}
      <div class="section-head"><h2>{group.pos}</h2><span class="label">{group.list.length}</span></div>
      <div class="card">
        {#each group.list as player (player.id)}
          {@const s = statFor(player.id)}
          <div class="prow" class:inactive={player.active === false}>
            <span class="pav">{initials(player.name)}</span>
            <span class="nm">
              {player.name}
              <small>
                {s ? `${s.apps} ${s.apps === 1 ? 'app' : 'apps'} · ${s.goals} G · ${s.assists} A` : 'No matches yet'}
              </small>
            </span>
            {#if s?.rating}
              <span class="rating" style="background:{ratingColor(s.rating)}">{s.rating.toFixed(1)}</span>
            {/if}
            <span class="prow-actions">
              <select
                class="pos-select"
                aria-label="Position"
                value={player.position || 'MID'}
                onchange={(e) => updatePlayer(player.id, { position: e.currentTarget.value })}>
                {#each POSITIONS as p}<option value={p}>{p}</option>{/each}
              </select>
              <button
                class="avail"
                class:out={player.active === false}
                onclick={() => updatePlayer(player.id, { active: player.active === false })}
                title={player.active === false ? 'Unavailable, tap to bring back in' : 'Available, tap to mark out'}
>{player.active === false ? 'Out' : 'In'}</button>
              {#if confirming === player.id}
                <button class="btn sm danger" onclick={() => { removePlayer(player.id); confirming = null; }}>Sure?</button>
              {:else}
                <button class="x" onclick={() => (confirming = player.id)} aria-label="Remove">×</button>
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
        Position is only the default when you name them - you can move anyone anywhere on the team sheet.
      </p>
    </div>
  </form>
</div>
