<script>
  import { app, start, saveName } from './lib/store.svelte.js';
  import { route } from './lib/router.svelte.js';
  import Matches from './views/Matches.svelte';
  import MatchDetail from './views/MatchDetail.svelte';
  import Roster from './views/Roster.svelte';
  import Season from './views/Season.svelte';
  import Icon from './lib/Icon.svelte';

  start();

  let nameDraft = $state('');
  let matchParts = $derived(route.path.startsWith('/match/') ? route.path.slice(7).split('/') : []);
  let matchId = $derived(matchParts[0] || null);
  let matchTab = $derived(matchParts[1] || 'lineups');

  const NAV = [
    { href: '#/', path: '/', label: 'Matches', icon: 'home' },
    { href: '#/squad', path: '/squad', label: 'Squad', icon: 'squad' },
    { href: '#/season', path: '/season', label: 'Season', icon: 'trophy' }
  ];

  const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
</script>

<header class="topbar">
  <div class="topbar-inner">
    <a class="logo" href="#/">
      <span class="logo-mark">M</span>
      <span class="logo-text">MOTM</span>
    </a>

    {#if app.name}
      <div class="greet">
        <span class="av">{initials(app.name)}</span>
        <span class="greet-txt">
          <small>Hey,</small>
          <b>{app.name}</b>
        </span>
      </div>
    {/if}

    <nav class="pillnav" aria-label="Sections">
      {#each NAV as item}
        <a
          href={item.href}
          class:on={route.path === item.path || (item.path === '/' && matchId)}
          aria-label={item.label}
          title={item.label}
        >
          <Icon name={item.icon} size={21} />
        </a>
      {/each}
    </nav>
  </div>
</header>

<main class="shell">
  {#if app.fatal}
    <div class="banner"><b>Firebase</b>{app.fatal}</div>
  {/if}

  {#if matchId}
    <MatchDetail id={matchId} tab={matchTab} />
  {:else if route.path === '/squad'}
    <Roster />
  {:else if route.path === '/season'}
    <Season />
  {:else}
    <Matches />
  {/if}
</main>

{#if app.needsName && !app.fatal}
  <div class="backdrop">
    <form class="modal" onsubmit={(e) => { e.preventDefault(); saveName(nameDraft); }}>
      <h2>What's your name?</h2>
      <p class="muted" style="font-size:13px; margin:8px 0 18px">
        It sits next to your ratings so people know whose card is whose. No password, no account.
      </p>
      <label class="field"><span>First and last name</span>
        <input bind:value={nameDraft} maxlength="40" placeholder="Your name" />
      </label>
      <button class="btn primary" style="margin-top:16px; width:100%; justify-content:center" type="submit">
        Continue
      </button>
    </form>
  </div>
{/if}

{#if app.toast}<div class="toast" role="status">{app.toast}</div>{/if}
