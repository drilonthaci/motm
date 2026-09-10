<script>
  import { kit, startersOf, ratingColor } from './model.js';

  let { match, players, ratings = {}, goals = {} } = $props();

  const byId = (id) => players.find((p) => p.id === id);
  const first = (name) => name.split(' ')[0];
  const initials = (name) =>
    name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  /* Vertical pitch, SofaScore style: side A defends the bottom, side B the
     top. Rows run GK → FWD toward the halfway line and mirror for the away
     half, so a 1-2-2-1 reads the same both ways up. */
  const ROWS = ['GK', 'DEF', 'MID', 'FWD'];
  const DEPTH = { GK: 7, DEF: 21, MID: 32, FWD: 42 };

  function place(slots, side) {
    const out = [];
    for (const row of ROWS) {
      const list = slots.filter((s) => (s.pos || 'MID') === row);
      list.forEach((slot, i) => {
        const depth = DEPTH[row];
        out.push({
          ...slot,
          side,
          top: side === 'A' ? 100 - depth : depth,
          left: ((i + 1) / (list.length + 1)) * 100
        });
      });
    }
    return out;
  }

  let dots = $derived([
    ...place(startersOf(match, 'A'), 'A'),
    ...place(startersOf(match, 'B'), 'B')
  ]);
</script>

<div class="pitch">
  <div class="chalk edge"></div>
  <div class="chalk half"></div>
  <div class="chalk circle"></div>
  <div class="chalk box top"></div>
  <div class="chalk box bot"></div>
  <div class="chalk six top"></div>
  <div class="chalk six bot"></div>

  {#each dots as d (d.side + d.id)}
    {@const player = byId(d.id)}
    {@const k = kit(d.side)}
    {#if player}
      <div class="pdot" style="left:{d.left}%; top:{d.top}%">
        <div class="shirt" style="background:{k.fill}; color:{k.text}; border:1.5px solid {k.line}">
          {initials(player.name)}
          {#if ratings[d.id]}
            <span class="rating" style="background:{ratingColor(ratings[d.id].avg)}">
              {ratings[d.id].avg.toFixed(1)}
            </span>
          {/if}
        </div>
        <span class="nm">
          {first(player.name)}{#if goals[d.id]}<span class="goals"> ⚽{goals[d.id] > 1 ? goals[d.id] : ''}</span>{/if}
        </span>
      </div>
    {/if}
  {/each}
</div>
