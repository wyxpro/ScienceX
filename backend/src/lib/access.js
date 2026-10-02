/** 统一的资源可见性规则：有 owner/user 字段时严格匹配；历史演示数据仅对 demo 用户可见。 */
function canAccess(resource, userId) {
  if (!resource) return false;
  const ownerId = resource.owner_id || resource.user_id;
  return ownerId ? ownerId === userId : userId === 'u1';
}

function canAccessTeam(team, userId) {
  if (!team || !userId) return false;
  return team.owner === userId || team.members?.some((member) => member.user_id === userId);
}

function canManageTeam(team, userId) {
  if (!team || !userId) return false;
  if (team.owner === userId) return true;
  return team.members?.some((member) => member.user_id === userId && ['owner', 'admin'].includes(member.role));
}

module.exports = { canAccess, canAccessTeam, canManageTeam };
