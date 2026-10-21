import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPaidParticipantsExport } from '../src/lib/paidParticipantExport.ts';
import { csvCell } from '../src/lib/csv.ts';
import type { Team, User } from '../src/types/index.ts';

const user = (id: string, team?: string): User => ({
  user_id: id, name: id, email: `${id}@example.test`, team_id: team,
  roll_number: '001234', hostel: 'Amber', mess: 'F Mess', created_at: '2026-10-21T10:00:00Z',
});
const team = (id: string, status: string, leader: string): Team => ({
  team_id: id, name: `Team ${id}`, leader, leader_user_id: leader, contact: '9000000000',
  domain: 'software', payment_status: status, ispublic: false, created_at: '2026-10-21T10:00:00Z',
});
const users = [user('member-a', 'A'), user('leader-a', 'A'), user('leader-b', 'B'), user('pending', 'C'), user('reversed', 'D'), user('solo')];
const teams = [team('A', 'PAID', 'leader-a'), team('B', ' paid ', 'leader-b'), team('C', 'Pending', 'pending'), team('D', 'reversed', 'reversed')];
const page = (number: number, list = users) => ({
  users: list.slice((number - 1) * 2, number * 2),
  pagination: { total: list.length, page: number, limit: 2, pages: Math.max(1, Math.ceil(list.length / 2)) },
});

test('exports every paid team member across all pages, including leaders and team details', async () => {
  const calls: number[] = [];
  const result = await loadPaidParticipantsExport({
    loadUsersPage: async number => { calls.push(number); return page(number); },
    loadTeams: async () => teams,
  });
  assert.deepEqual(calls, [1, 2, 3]);
  assert.equal(result.participantCount, 3);
  assert.equal(result.teamCount, 2);
  assert.match(result.csv, /"leader-a".*"A","Team A","Leader"/);
  assert.match(result.csv, /"member-a".*"A","Team A","Member"/);
  assert.match(result.csv, /"leader-b".*"B","Team B","Leader"/);
  assert.doesNotMatch(result.csv, /pending@example|reversed@example|solo@example/);
  assert.ok(result.csv.indexOf('leader-a@example') < result.csv.indexOf('member-a@example'));
  assert.match(result.csv, /"001234","","Amber","F Mess"/);
});

test('quotes commas, quotes and newlines, and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('A, "B"\nC'), '"A, ""B""\nC"');
  for (const value of ['=SUM(1,2)', ' +123', '-123', '@value', '\ttext', '\ntext']) {
    assert.ok(csvCell(value).startsWith('"\''));
  }
  assert.equal(csvCell(undefined), '""');
});

test('escapes participant and team content in the generated CSV', async () => {
  const list = [{ ...users[0], name: '=HYPERLINK("bad")' }];
  const result = await loadPaidParticipantsExport({
    loadUsersPage: async number => page(number, list),
    loadTeams: async () => [{ ...teams[0], name: 'Team, "A"' }],
  });
  assert.ok(result.csv.includes(csvCell(list[0].name)));
  assert.ok(result.csv.includes(csvCell('Team, "A"')));
});

test('fails without a partial export when a later participant page fails', async () => {
  await assert.rejects(loadPaidParticipantsExport({
    loadUsersPage: async number => { if (number === 2) throw new Error('Page unavailable'); return page(number); },
    loadTeams: async () => teams,
  }), /Page unavailable/);
});

test('rejects incomplete, duplicate, or changing pagination rather than silently missing people', async () => {
  for (const broken of [
    { ...page(2), users: [] },
    { ...page(2), users: page(1).users },
    { ...page(2), pagination: { ...page(2).pagination, total: 7 } },
  ]) {
    await assert.rejects(loadPaidParticipantsExport({
      loadUsersPage: async number => number === 2 ? broken : page(number),
      loadTeams: async () => teams,
    }), /Please try again/);
  }
});

test('shows a clear empty result and propagates failure to load authoritative team status', async () => {
  await assert.rejects(loadPaidParticipantsExport({ loadUsersPage: async number => page(number), loadTeams: async () => [] }), /No participants in paid teams/);
  await assert.rejects(loadPaidParticipantsExport({ loadUsersPage: async number => page(number, []), loadTeams: async () => teams }), /No participants in paid teams/);
  await assert.rejects(loadPaidParticipantsExport({ loadUsersPage: async number => page(number), loadTeams: async () => { throw new Error('Teams unavailable'); } }), /Teams unavailable/);
});
