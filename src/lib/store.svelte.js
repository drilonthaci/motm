import { auth, db, signInAnonymously } from '../firebase.js';
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
  addDoc, getDocs, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { ratingSummary, manOfTheMatch } from './model.js';

export const app = $state({
  uid: null,
  name: '',
  needsName: false,
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

export async function start() {
  try {
    const { user } = await signInAnonymously(auth);
    app.uid = user.uid;
  } catch (error) {
    app.fatal = 'Anonymous sign-in is disabled on this Firebase project. Enable it under Authentication → Sign-in method.';
    return;
  }

  onSnapshot(doc(db, 'profiles', app.uid), (snap) => {
    const name = snap.data()?.displayName;
    if (name) app.name = name;
    else app.needsName = true;
  }, (e) => blame(e, 'read your profile'));

  onSnapshot(query(collection(db, 'players'), orderBy('name')), (snap) => {
    app.players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, (e) => blame(e, 'read the roster'));

  onSnapshot(collection(db, 'matches'), (snap) => {
    app.matches = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((x, y) => (y.date ?? '').localeCompare(x.date ?? '') || (y.time ?? '').localeCompare(x.time ?? ''));
    app.ready = true;
  }, (e) => { blame(e, 'read matches'); app.ready = true; });
}

export async function saveName(raw) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return say('Enter at least your first name.');
  await setDoc(doc(db, 'profiles', app.uid), { displayName: name, updatedAt: serverTimestamp() }, { merge: true });
  app.name = name;
  app.needsName = false;
  say(`Welcome, ${name.split(' ')[0]}.`);
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
