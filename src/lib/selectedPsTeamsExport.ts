import type { Team } from '../types';
import { csvCell } from './csv.ts';

export function selectedPsTeamsExport(teams: Team[]) {
  const selected = teams.filter(team => typeof team.problem_statement === 'string' && team.problem_statement.trim())
    .sort((a, b) => a.problem_statement!.localeCompare(b.problem_statement!) || a.name.localeCompare(b.name) || a.team_id.localeCompare(b.team_id));
  if (!selected.length) throw new Error('No teams have selected a problem statement yet.');
  const rows: unknown[][] = [[
    'Team ID', 'Team Name', 'Domain', 'Problem Statement', 'Leader', 'Contact Phone', 'Member Count', 'Payment Status', 'Visibility', 'Created At',
  ], ...selected.map(team => [
    team.team_id, team.name, team.domain, team.problem_statement, team.leader, team.contact,
    team.member_count ?? team.members?.length, team.payment_status, team.ispublic ? 'Public' : 'Private', team.created_at,
  ])];
  return { csv: rows.map(row => row.map(csvCell).join(',')).join('\r\n'), teamCount: selected.length };
}
