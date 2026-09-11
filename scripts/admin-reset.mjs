/* Deletes the leftovers from the anonymous-auth era.
 *
 * Needs a service account key, because deleting auth users and other
 * people's documents is impossible from the client SDK by design.
 *
 *   1. Firebase Console, Project settings, Service accounts,
 *      Generate new private key. Save it as service-account.json here.
 *   2. node scripts/admin-reset.mjs            dry run, shows what it would do
 *   3. node scripts/admin-reset.mjs --yes      actually does it
 *   4. Delete service-account.json afterwards. It is gitignored, but still.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const GO = process.argv.includes('--yes');
const KEY = process.argv.find((a) => a.endsWith('.json')) ?? './service-account.json';

let key;
try { key = JSON.parse(readFileSync(KEY, 'utf8')); }
catch { console.error(`Cannot read ${KEY}. See the header of this file.`); process.exit(1); }

initializeApp({ credential: cert(key) });
const auth = getAuth();
const db = getFirestore();

console.log(GO ? '=== LIVE RUN ===\n' : '=== DRY RUN, pass --yes to apply ===\n');

/* 1. Anonymous auth users. */
const anon = [];
let page = await auth.listUsers(1000);
while (true) {
  for (const u of page.users) {
    if (u.providerData.length === 0) anon.push(u.uid);
  }
  if (!page.pageToken) break;
  page = await auth.listUsers(1000, page.pageToken);
}
console.log(`anonymous auth users: ${anon.length}`);
if (GO && anon.length) {
  for (let i = 0; i < anon.length; i += 1000) {
    const r = await auth.deleteUsers(anon.slice(i, i + 1000));
    console.log(`  deleted ${r.successCount}, failed ${r.failureCount}`);
  }
}

/* 2. Firestore documents those accounts left behind. Deleting the auth
      user does not touch their documents, and it is the claims that block
      you from claiming yourself again. */
const wipe = async (name) => {
  const snap = await db.collection(name).get();
  console.log(`${name}: ${snap.size}`);
  if (GO) { for (const d of snap.docs) await d.ref.delete(); }
};
await wipe('profiles');
await wipe('claims');

let cards = 0;
const matches = await db.collection('matches').get();
for (const m of matches.docs) {
  const votes = await m.ref.collection('votes').get();
  cards += votes.size;
  if (GO) {
    for (const v of votes.docs) await v.ref.delete();
    await m.ref.update({ ratings: FieldValue.delete(), motmId: FieldValue.delete() });
  }
}
console.log(`rating cards across ${matches.size} matches: ${cards}`);

console.log(GO
  ? '\nDone. Matches, scores, lineups and the roster are untouched.'
  : '\nNothing changed. Re-run with --yes to apply.');
process.exit(0);
