import type { Pagination, Team, User } from '../types';
import { csvCell } from './csv.ts';

interface UserPage { users: User[]; pagination: Pagination; }
interface ExportSources {
  loadUsersPage: (page: number) => Promise<UserPage>;
  loadTeams: () => Promise<Team[]>;
}

export async function loadPaidParticipantsExport({ loadUsersPage, loadTeams }: ExportSources) {
  const first = await loadUsersPage(1);
  const { total, pages, limit } = first.pagination;
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(limit) || limit < 1 ||
      !Number.isSafeInteger(pages) || pages !== Math.max(1, Math.ceil(total / limit))) {
    throw new Error('Could not verify all participant pages. Please try again.');
  }

  const users = new Map<string, User>();
  for (let page = 1; page <= pages; page++) {
    const result = page === 1 ? first : await loadUsersPage(page);
    const pagination = result.pagination;
    if (pagination.page !== page || pagination.total !== total || pagination.pages !== pages ||
        pagination.limit !== limit || result.users.length !== Math.min(limit, total - (page - 1) * limit)) {
      throw new Error('Participant records changed during export. Please try again.');
    }
    for (const user of result.users) {
      if (!user.user_id || users.has(user.user_id)) {
        throw new Error('Could not verify a complete participant list. Please try again.');
      }
      users.set(user.user_id, user);
    }
  }

  // Current team status is authoritative; an old approved QR record may have been reversed.
  const paidTeams = new Map((await loadTeams())
    .filter(team => team.payment_status?.trim().toLowerCase() === 'paid')
    .map(team => [team.team_id, team]));
  const participants = [...users.values()].flatMap(user => {
    const team = user.team_id ? paidTeams.get(user.team_id) : undefined;
    return team ? [{ user, team }] : [];
  }).sort((a, b) => a.team.team_id.localeCompare(b.team.team_id) ||
    Number(b.user.user_id === b.team.leader_user_id) - Number(a.user.user_id === a.team.leader_user_id) ||
    a.user.name.localeCompare(b.user.name) || a.user.user_id.localeCompare(b.user.user_id));

  if (!participants.length) throw new Error('No participants in paid teams are available to export.');
  const rows: unknown[][] = [[
    'User ID', 'Name', 'Email', 'Roll Number', 'Gender', 'Hostel', 'Mess', 'Registered At',
    'Team ID', 'Team Name', 'Team Role', 'Team Leader', 'Team Contact', 'Domain', 'Problem Statement', 'Payment Status',
  ], ...participants.map(({ user, team }) => [
    user.user_id, user.name, user.email, user.roll_number, user.gender, user.hostel, user.mess, user.created_at,
    team.team_id, team.name, user.user_id === team.leader_user_id ? 'Leader' : 'Member',
    team.leader, team.contact, team.domain, team.problem_statement, team.payment_status,
  ])];
  return {
    csv: rows.map(row => row.map(csvCell).join(',')).join('\r\n'),
    participantCount: participants.length,
    teamCount: new Set(participants.map(({ team }) => team.team_id)).size,
  };
}
