/** 统一的资源可见性规则：有 owner/user 字段时严格匹配；历史演示数据仅对 demo 用户可见。 */
function canAccess(resource, userId) {
  if (!resource) return false;
  const ownerId = resource.owner_id || resource.user_id;
  return ownerId ? ownerId === userId : userId === 'u1';
}

module.exports = { canAccess };
