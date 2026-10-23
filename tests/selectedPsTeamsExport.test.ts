import assert from 'node:assert/strict';
import test from 'node:test';
import { selectedPsTeamsExport } from '../src/lib/selectedPsTeamsExport.ts';
import type { Team } from '../src/types/index.ts';
const team = (id: string, ps?: string, payment = 'PAID'): Team => ({ team_id: id, name: `Team ${id}`, leader: `${id}@example.test`, leader_user_id: id, contact: '9000000000', domain: 'software', problem_statement: ps, payment_status: payment, ispublic: false, created_at: '2026-10-24T10:00:00Z', member_count: 5 });

test('exports every selected team, includes unpaid teams and excludes empty selections', () => {
  const result = selectedPsTeamsExport([team('A', 'Challenge A'), team('B', 'Challenge B', 'Pending'), team('C'), team('D', ''), team('E', '  \n')]);
  assert.equal(result.teamCount, 2);
  assert.equal(result.csv.split('\r\n').length, 3);
  assert.match(result.csv, /"A","Team A","software","Challenge A","A@example.test","9000000000","5","PAID"/);
  assert.match(result.csv, /"B","Team B".*"Pending"/);
  assert.doesNotMatch(result.csv, /Team C|Team D|Team E/);
});
test('keeps selected historical titles, escapes spreadsheet content and does not invent missing counts', () => {
  const result = selectedPsTeamsExport([{ ...team('A', '=Unsafe, "title"\nline'), name: '+Formula', contact: '+919000000000', member_count: undefined }]);
  assert.match(result.csv, /"'\+Formula"/);
  assert.ok(result.csv.includes('"\'=Unsafe, ""title""\nline"'));
  assert.match(result.csv, /"'\+919000000000","","PAID"/);
});
test('reports an empty selection instead of downloading an apparently complete empty file', () => {
  assert.throws(() => selectedPsTeamsExport([team('A')]), /No teams have selected/);
});
