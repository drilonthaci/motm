import { auth, db, googleProvider } from '../firebase.js';
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut
} from 'firebase/auth';
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
  addDoc, getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { ratingSummary, manOfTheMatch } from './model.js';

export const app = $state({
  uid: null,
  /** null until Firebase has told us whether anyone is signed in. */
  authReady: false,
  signingIn: false,
  email: '',
  photo: '',
  name: '',
  /** Which roster player this device belongs to, so you cannot rate yourself. */
  meId: null,
  needsName: false,
  needsClaim: false,
  /** Player ids already claimed by someone, keyed to the owning uid. */
  claims: {},
  /** Dismissed the picker for this session without claiming. */
  claimSkipped: false,
  ready: false,
  players: [],
  matches: [],
  /** Rating cards for the match currently open, keyed by voter uid. */
  cards: [],
  toast: '',
  fatal: ''
});

let toastTimer;
export function say(message) {
  app.toast = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (app.toast = ''), 3400);
}

function blame(error, what) {
  console.error(what, error);
  if (error?.code === 'permission-denied') {
    app.fatal = `Firestore blocked "${what}" - the deployed rules are missing a block for this collection. Deploy firestore.rules: npx firebase-tools login && npx firebase-tools deploy --only firestore:rules`;
  } else {
    say(`Could not ${what}.`);
  }
}

/* Subscriptions live only while somebody is signed in, so signing out
   stops them cleanly and signing back in does not stack duplicates. */
let unsubscribers = [];

function stopWatching() {
  unsubscribers.forEach((fn) => fn());
  unsubscribers = [];
  app.players = [];
  app.matches = [];
  app.cards = [];
  app.claims = {};
  app.ready = false;
}

function watchEverything() {
  unsubscribers.push(
    onSnapshot(doc(db, 'profiles', app.uid), (snap) => {
      const data = snap.data();
      app.name = data?.displayName ?? app.name;
      app.needsName = !data?.displayName;
      app.meId = data?.playerId ?? null;
      app.needsClaim = Boolean(data?.displayName) && data?.playerId === undefined;
    }, (e) => blame(e, 'read your profile')),

    onSnapshot(collection(db, 'claims'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => (map[d.id] = d.data().uid));
      app.claims = map;
    }, (e) => blame(e, 'read the claim list')),

    onSnapshot(query(collection(db, 'players'), orderBy('name')), (snap) => {
      app.players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }, (e) => blame(e, 'read the roster')),

    onSnapshot(collection(db, 'matches'), (snap) => {
      app.matches = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((x, y) => (y.date ?? '').localeCompare(x.date ?? '') || (y.time ?? '').localeCompare(x.time ?? ''));
      app.ready = true;
    }, (e) => { blame(e, 'read matches'); app.ready = true; })
  );
}

export async function start() {
  // A redirect sign-in finishes here, on the way back from Google.
  try { await getRedirectResult(auth); } catch (e) { blame(e, 'finish signing in'); }

  onAuthStateChanged(auth, async (user) => {
    stopWatching();
    app.authReady = true;
    app.signingIn = false;

    if (!user) {
      app.uid = null;
      app.email = '';
      app.photo = '';
      app.name = '';
      app.meId = null;
      app.needsName = false;
      app.needsClaim = false;
      return;
    }

    app.uid = user.uid;
    app.email = user.email ?? '';
    app.photo = user.photoURL ?? '';
    app.name = user.displayName ?? '';

    // Google already told us their name, so seed the profile and skip asking.
    if (user.displayName) {
      try {
        await setDoc(
          doc(db, 'profiles', user.uid),
          { displayName: user.displayName.slice(0, 40), email: user.email ?? null, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (e) { blame(e, 'save your profile'); }
    }

    watchEverything();
  });
}

/** Popups are unreliable inside an installed PWA and in some mobile
 *  browsers, so fall back to a full redirect when one is refused. */
export async function signIn() {
  app.signingIn = true;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone;

  try {
    if (standalone) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code = error?.code ?? '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      try { return await signInWithRedirect(auth, googleProvider); } catch (e) { error = e; }
    }
    app.signingIn = false;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    if (code === 'auth/unauthorized-domain') {
      app.fatal = `This domain is not in the Firebase authorized list. Add ${location.hostname} under Authentication, Settings, Authorized domains.`;
      return;
    }
    if (code === 'auth/operation-not-allowed') {
      app.fatal = 'Google sign-in is not enabled on this Firebase project. Turn it on under Authentication, Sign-in method.';
      return;
    }
    blame(error, 'sign you in');
  }
}

export async function signOutNow() {
  try { await signOut(auth); say('Signed out.'); }
  catch (e) { blame(e, 'sign you out'); }
}

export async function saveName(raw) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return say('Enter at least your first name.');
  await setDoc(doc(db, 'profiles', app.uid), { displayName: name, updatedAt: serverTimestamp() }, { merge: true });
  app.name = name;
  app.needsName = false;
  say(`Welcome, ${name.split(' ')[0]}.`);
}

/** Link this device to a roster player. `null` means "I do not play", which
 *  is still an answer, so we store it rather than asking again. */
/** Claiming is one-way: once you say which player you are, it is fixed.
 *  Otherwise switching identity is a one-tap route to rating yourself.
 *  Answering "not on the list" stores null and can be set later, which
 *  only ever narrows what you may rate. */
export async function claimPlayer(playerId) {
  // `undefined` reopens the picker, only reachable while unclaimed.
  if (playerId === undefined) {
    if (app.meId) return say('Who you are is locked. Ask an organiser to change it.');
    app.needsClaim = true;
    app.claimSkipped = false;
    return;
  }
  if (app.meId) return say('Who you are is locked.');

  try {
    /* The claim doc is the lock. Rules permit create only, so if someone
       already holds this player the write fails and nobody can end up
       sharing an identity. Written before the profile so a lost race
       leaves no half-claimed profile behind. */
    await setDoc(doc(db, 'claims', playerId), {
      uid: app.uid,
      claimedAt: serverTimestamp()
    });
  } catch (e) {
    if (e?.code === 'permission-denied') {
      return say('Somebody has already claimed that player. Pick another, or ask an organiser.');
    }
    return blame(e, 'claim that player');
  }

  try {
    await setDoc(
      doc(db, 'profiles', app.uid),
      { displayName: app.name, playerId, updatedAt: serverTimestamp() },
      { merge: true }
    );
    app.meId = playerId;
    app.needsClaim = false;
    app.claimSkipped = false;
    say('Saved. You will not be able to rate yourself.');
  } catch (e) { blame(e, 'save who you are'); }
}

/** Close the picker without claiming. Rating stays blocked until they do. */
export function skipClaim() {
  app.claimSkipped = true;
}

/* ---------- roster ---------- */

export async function addPlayer({ name, position }) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2) return say('That name is too short.');
  if (app.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) return say(`${clean} is already on the roster.`);
  try {
    await addDoc(collection(db, 'players'), { name: clean, position, active: true, createdAt: serverTimestamp() });
    say(`${clean} added to the roster.`);
  } catch (e) { blame(e, 'add a player'); }
}

export async function updatePlayer(id, patch) {
  try { await updateDoc(doc(db, 'players', id), patch); }
  catch (e) { blame(e, 'update that player'); }
}

export async function removePlayer(id) {
  try { await deleteDoc(doc(db, 'players', id)); say('Player removed.'); }
  catch (e) { blame(e, 'remove that player'); }
}

/* ---------- matches ---------- */

export async function createMatch(fields) {
  try {
    const ref = await addDoc(collection(db, 'matches'), {
      ...fields,
      lineupA: [],
      lineupB: [],
      events: [],
      finished: false,
      createdBy: app.name || 'Someone',
      createdAt: serverTimestamp()
    });
    say('Match created. Now pick the teams.');
    return ref.id;
  } catch (e) { blame(e, 'create the match'); return null; }
}

export async function patchMatch(id, patch) {
  try { await updateDoc(doc(db, 'matches', id), { ...patch, updatedAt: serverTimestamp() }); }
  catch (e) { blame(e, 'save the match'); }
}

export async function deleteMatch(id) {
  try {
    // Rules forbid deleting someone else's vote, so drop what we can and
    // let the orphaned subcollection go with the parent.
    const cards = await getDocs(collection(db, 'matches', id, 'votes'));
    await Promise.allSettled(cards.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'matches', id));
    say('Match deleted.');
  } catch (e) { blame(e, 'delete the match'); }
}

/* ---------- ratings ---------- */

export function watchCards(matchId) {
  app.cards = [];
  return onSnapshot(collection(db, 'matches', matchId, 'votes'), (snap) => {
    app.cards = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  }, (e) => blame(e, 'read the ratings'));
}

export async function submitCard(matchId, scores) {
  const clean = {};
  for (const [playerId, value] of Object.entries(scores)) {
    // Never let your own score through, whatever the UI happens to hold.
    if (playerId === app.meId) continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) clean[playerId] = Math.min(10, Math.max(1, Math.round(n * 10) / 10));
  }
  if (!Object.keys(clean).length) return say('Rate at least one player first.');
  try {
    await setDoc(doc(db, 'matches', matchId, 'votes', app.uid), {
      voterName: app.name, scores: clean, updatedAt: serverTimestamp()
    });
    // Denormalise onto the match so the season table needs one listener, not one per match.
    const snap = await getDocs(collection(db, 'matches', matchId, 'votes'));
    const summary = ratingSummary(snap.docs.map((d) => d.data()));
    const best = manOfTheMatch(summary);
    await updateDoc(doc(db, 'matches', matchId), { ratings: summary, motmId: best?.playerId ?? null });
    say('Ratings saved.');
  } catch (e) { blame(e, 'save your ratings'); }
}
