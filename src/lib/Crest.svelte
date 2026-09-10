<script>
  /* Blacks vs whites, drawn as the bibs they actually are: a jersey badge
     with the squad letter on the chest. Side A is black, side B is white. */
  let { side = 'A', size = 34 } = $props();

  const black = side !== 'B';

  const SHIRT = 'M17.5 6.5 11 9.5 4.5 15l5.5 7.5 4.5-3.6V39c6 1.8 13 1.8 19 0V18.9l4.5 3.6L43.5 15 37 9.5l-6.5-3c-1.8 4-11.2 4-13 0Z';
</script>

<svg
  class="crest2"
  class:white={!black}
  viewBox="0 0 48 48"
  width={size}
  height={size}
  role="img"
  aria-label={black ? 'Blacks' : 'Whites'}
>
  <path
    d={SHIRT}
    fill={black ? '#14151a' : '#f2f2ee'}
    stroke={black ? '#41454d' : '#c9cac4'}
    stroke-width="1.6"
    stroke-linejoin="round"
  />
  <!-- Twin chest stripes so the two kits differ by more than fill alone. -->
  <path
    d="M20 21v16M28 21v16"
    stroke={black ? 'rgba(255,255,255,.13)' : 'rgba(0,0,0,.1)'}
    stroke-width="2.4"
    stroke-linecap="round"
  />
  <text
    x="24" y="32.5"
    text-anchor="middle"
    font-family="Inter, system-ui, sans-serif"
    font-size="15"
    font-weight="800"
    letter-spacing="-0.5"
    fill={black ? '#ffffff' : '#14151a'}
  >{black ? 'B' : 'W'}</text>
</svg>
