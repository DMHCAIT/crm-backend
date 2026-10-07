const TEAM_ROLES = ['senior_manager', 'manager', 'team_leader'];
const ADMIN_ROLES = ['super_admin', 'admin'];

async function loadReportingUsers(supabase, columns = 'id, username, email, role, reports_to') {
  const users = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('users')
      .select(columns)
      .order('id')
      .range(offset, offset + 499);
    if (error) throw error;
    if (!data) throw new Error('Reporting hierarchy query returned no data');
    users.push(...data);
    if (data.length < 500) return users;
  }
}

function findReportingUser(user, users) {
  return users.find(candidate => candidate.id === (user.id || user.userId)) ||
    users.find(candidate => user.username && candidate.username === user.username) ||
    users.find(candidate => user.email && candidate.email === user.email);
}

function getReportingTeam(userId, users) {
  const visited = new Set([userId]);
  const team = [];
  const supervisors = [userId];
  for (let index = 0; index < supervisors.length; index++) {
    for (const user of users) {
      if (user.reports_to === supervisors[index] && !visited.has(user.id)) {
        visited.add(user.id);
        team.push(user);
        supervisors.push(user.id);
      }
    }
  }
  return team;
}

async function getAccessibleUsernames(supabase, user) {
  if (ADMIN_ROLES.includes(user.role)) return null;
  const users = await loadReportingUsers(supabase);
  const currentUser = findReportingUser(user, users);
  if (!currentUser) throw new Error('Current user not found in reporting hierarchy');
  const team = TEAM_ROLES.includes(user.role) ? getReportingTeam(currentUser.id, users) : [];
  return [currentUser, ...team].map(member => member.username).filter(Boolean);
}

module.exports = { TEAM_ROLES, ADMIN_ROLES, loadReportingUsers, findReportingUser, getReportingTeam, getAccessibleUsernames };
