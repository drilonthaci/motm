/* Who rated whom. Read-only.
   Usage: npm run votes            all matches
          npm run votes -- 2026-09  only matches whose date starts with this */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const filter = process.argv[2] ?? '';

const app = initializeApp({
  apiKey: 'AIzaSyCmRiMTQgoJoyTKHpCXCthLVuhIZkalLgY',
  authDomain: 'gjirafa-motm.firebaseapp.com',
  projectId: 'gjirafa-motm',
  storageBucket: 'gjirafa-motm.firebasestorage.app',
  messagingSenderId: '1063992757165',
  appId: '1:1063992757165:web:6bb2acc0725bb00f816f24'
});
await signInAnonymously(getAuth(app));
const db = getFirestore(app);

const players = new Map((await getDocs(collection(db, 'players'))).docs.map((d) => [d.id, d.data().name]));
const profiles = new Map((await getDocs(collection(db, 'profiles'))).docs.map((d) => [d.id, d.data()]));
const nameOf = (id) => players.get(id) ?? '(deleted player)';

const matches = (await getDocs(collection(db, 'matches'))).docs
  .filter((m) => (m.data().date ?? '').startsWith(filter))
  .sort((a, b) => (b.data().date ?? '').localeCompare(a.data().date ?? ''));

let flagged = 0;

for (const m of matches) {
  const d = m.data();
  const votes = await getDocs(collection(db, 'matches', m.id, 'votes'));
  console.log(`\n=== ${d.date}  ${d.teamA?.name ?? 'A'} v ${d.teamB?.name ?? 'B'}  (${votes.size} card${votes.size === 1 ? '' : 's'}) ===`);
  if (!votes.size) { console.log('  nobody rated this match'); continue; }

  for (const v of votes.docs) {
    const card = v.data();
    const claimed = profiles.get(v.id)?.playerId ?? null;
    const identity = claimed ? nameOf(claimed) : '(no claim)';
    console.log(`\n  ${card.voterName || '?'}   is: ${identity}   uid ${v.id.slice(0, 8)}`);

    const rows = Object.entries(card.scores ?? {}).sort((a, b) => b[1] - a[1]);
    if (!rows.length) { console.log('     (empty card)'); continue; }
    for (const [pid, score] of rows) {
      // A claimed self-rating is impossible under the current rules, so this
      // only ever fires on cards written before they were tightened.
      const self = claimed === pid;
      if (self) flagged += 1;
      console.log(`     ${String(score).padStart(4)}  ${nameOf(pid)}${self ? '   <-- SELF-RATED' : ''}`);
    }
  }
}

console.log(flagged ? `\n${flagged} self-rating(s) found.` : '\nNo self-ratings found.');
process.exit(0);
