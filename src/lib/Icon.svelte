<script>
  /* Flaticon UIcons, loaded as a web font from Flaticon's CDN (see index.html).
     Callers use semantic names so swapping a glyph is a one-line change here.
     `solid` switches to the filled weight, used for the active nav item. */
  let { name, size = 20, solid = false } = $props();

  const GLYPH = {
    home: 'home',
    squad: 'users',
    trophy: 'trophy',
    calendar: 'calendar',
    player: 'user',
    chart: 'chart-histogram',
    ball: 'football',
    save: 'goalkeeper',
    star: 'star',
    chevron: 'angle-small-right',
    minus: 'minus',
    plus: 'plus',
    signout: 'exit'
  };
</script>

<i
  class="fi fi-{solid ? 'sr' : 'rr'}-{GLYPH[name] ?? GLYPH.ball} ico-fi"
  style="font-size:{size}px"
  aria-hidden="true"
></i>
