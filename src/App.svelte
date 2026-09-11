<script>
  import { lockScroll } from './lib/scrollLock.js';
  import { app, start, saveName, claimPlayer, skipClaim, signIn, signOutNow } from './lib/store.svelte.js';
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

  $effect(() => (app.needsName && !app.fatal) ? lockScroll() : undefined);
</script>

{#if !app.authReady}
  <div class="boot"><span class="boot-mark">M</span></div>
{:else if !app.uid}
  <div class="signin">
    <div class="signin-card">
      <span class="signin-mark">M</span>
      <h1>MOTM</h1>
      <p>Gjirafa mini football. Line up the squads, log the goals, rate the game.</p>

      {#if app.fatal}
        <div class="banner" style="text-align:left"><b>Firebase</b>{app.fatal}</div>
      {/if}

      <button class="btn primary signin-btn" onclick={signIn} disabled={app.signingIn}>
        <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        {app.signingIn ? 'Opening Google...' : 'Continue with Google'}
      </button>

      <p class="signin-note">
        Any Google account works, personal or work. Signing in keeps you as the
        same player on every device, so nothing shows up as already taken.
      </p>
    </div>
  </div>
{:else}
<header class="topbar">
  <div class="topbar-inner">
    <a class="logo" href="#/">
      <span class="logo-mark">M</span>
      <span class="logo-text">MOTM</span>
    </a>

    {#if app.name}
      <div class="greet">
        {#if app.photo}
          <img class="av av-photo" src={app.photo} alt="" referrerpolicy="no-referrer" />
        {:else}
          <span class="av">{initials(app.name)}</span>
        {/if}
        <span class="greet-txt">
          <small>Hey,</small>
          <b>{app.name}</b>
        </span>
        <button class="signout" onclick={signOutNow} title="Sign out" aria-label="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
          </svg>
        </button>
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

{/if}

{#if app.needsClaim && !app.claimSkipped && !app.needsName && !app.fatal && app.players.length}
  <div class="backdrop">
    <div class="modal">
      <h2>Which one are you?</h2>
      <p class="muted" style="font-size:13px; margin:8px 0 18px">
        This keeps you off your own rating card. Pick once, it cannot be changed afterwards.
      </p>
      <div class="chips claim-chips">
        {#each app.players as p (p.id)}
          {@const takenBy = app.claims[p.id]}
          {@const mine = takenBy === app.uid}
          <button
            disabled={Boolean(takenBy) && !mine}
            title={takenBy && !mine ? 'Already claimed by someone else' : ''}
            onclick={() => claimPlayer(p.id)}
          >{p.name}{#if takenBy && !mine}&nbsp;·&nbsp;taken{/if}</button>
        {/each}
      </div>
      <button class="linkbtn" style="margin-top:18px" onclick={skipClaim}>
        Not playing? Skip, but you will not be able to rate
      </button>
    </div>
  </div>
{/if}

{#if app.needsName && !app.fatal}
  <div class="backdrop">
    <form class="modal" onsubmit={(e) => { e.preventDefault(); saveName(nameDraft); }}>
      <h2>What's your name?</h2>
      <p class="muted" style="font-size:13px; margin:8px 0 18px">
        It sits next to your ratings so people know whose card is whose. No password, no account.
      </p>
      <label class="field"><span>First and last name</span>
        <input
          bind:value={nameDraft}
          maxlength="40"
          placeholder="Your name"
          autocapitalize="words"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="done"
        />
      </label>
      <button class="btn primary" style="margin-top:16px; width:100%; justify-content:center" type="submit">
        Continue
      </button>
    </form>
  </div>
{/if}

{#if app.toast}<div class="toast" role="status">{app.toast}</div>{/if}
