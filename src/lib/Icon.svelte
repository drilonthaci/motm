<script>
  /* Two sources, one component.
     - IMAGE: specific Flaticon icons chosen by hand, shipped as monochrome
       PNGs in /public/icons and painted through a CSS mask so they take
       currentColor like a glyph would.
     - Everything else: Flaticon UIcons glyphs from the CDN web font (see
       index.html). `solid` picks the filled weight where one exists.
     Callers use semantic names so a swap is a one-line change here. */
  let { name, size = 20, solid = false } = $props();

  const IMAGE = {
    home: '/icons/home.png',
    trophy: '/icons/cup.png',
    signout: '/icons/logout.png'
  };

  const GLYPH = {
    squad: 'users',
    calendar: 'calendar',
    player: 'user',
    chart: 'chart-histogram',
    ball: 'football',
    save: 'goalkeeper',
    star: 'star',
    chevron: 'angle-small-right',
    minus: 'minus',
    plus: 'plus'
  };
</script>

{#if IMAGE[name]}
  <i
    class="ico-img"
    style="font-size:{size}px; --ico:url('{IMAGE[name]}')"
    aria-hidden="true"
  ></i>
{:else}
  <i
    class="fi fi-{solid ? 'sr' : 'rr'}-{GLYPH[name] ?? GLYPH.ball} ico-fi"
    style="font-size:{size}px"
    aria-hidden="true"
  ></i>
{/if}
