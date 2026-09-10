<script>
  // Monochrome line icons; emoji clash with the dark UI's flat palette.
  let { name, size = 20 } = $props();

  const PATHS = {
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    player: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
    squad: 'M9 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.3 3-5 7-5s7 1.7 7 5M17 6.2a3 3 0 010 5.6M19 20c0-2.4-.8-4-2-5',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    home: 'M3.5 10.6L12 3.5l8.5 7.1M6 9.6V20h12V9.6',
    trophy: 'M7.5 3.5h9v5.2a4.5 4.5 0 01-9 0V3.5zM7.5 5.5H4.5v1.8a3 3 0 003 3M16.5 5.5h3v1.8a3 3 0 01-3 3M9.5 20.5h5M12 14.2v6.3',
    star: 'M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6z',
    ball: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5l4 2.9-1.5 4.6h-5L8 10.4l4-2.9z'
  };
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <path d={PATHS[name] ?? PATHS.ball} />
</svg>
