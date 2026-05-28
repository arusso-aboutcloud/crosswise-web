// Collects directory role assignment data from Graph and joins it into
// engine records: { principal, assignments[] }.
//
// Principal type discrimination (must match engine principalFilter.types exactly):
//   /users              -> type 'user'
//   /groups             -> type 'group'
//   /servicePrincipals  -> type 'managedIdentity' when servicePrincipalType === 'ManagedIdentity'
//                          type 'servicePrincipal' for everything else
//
// Assignment normalization:
//   roleDefinitionId  <- Graph roleDefinitionId (unchanged)
//   scope             <- Graph directoryScopeId ('/' for tenant-wide)
//   plane             <- hardcoded 'entra' (directory role assignments are always Entra plane)

export async function collectRecords(graphApi) {
  const [rawAssignments, users, servicePrincipals, groups] = await Promise.all([
    graphApi.getDirectoryRoleAssignments(),
    graphApi.getUsers(),
    graphApi.getServicePrincipals(),
    graphApi.getGroups(),
  ]);

  // Build principal index: objectId -> normalized principal
  const principalIndex = new Map();

  for (const u of users) {
    principalIndex.set(u.id, {
      id: u.id,
      displayName: u.displayName || u.userPrincipalName || u.id,
      type: 'user',
      upn: u.userPrincipalName || '',
    });
  }

  for (const g of groups) {
    principalIndex.set(g.id, {
      id: g.id,
      displayName: g.displayName || g.id,
      type: 'group',
    });
  }

  for (const sp of servicePrincipals) {
    principalIndex.set(sp.id, {
      id: sp.id,
      displayName: sp.displayName || sp.id,
      type: sp.servicePrincipalType === 'ManagedIdentity' ? 'managedIdentity' : 'servicePrincipal',
      appId: sp.appId || '',
    });
  }

  // Group normalized assignments by principalId
  const byPrincipal = new Map();
  for (const asn of rawAssignments) {
    const pid = asn.principalId;
    if (!byPrincipal.has(pid)) byPrincipal.set(pid, []);
    byPrincipal.get(pid).push({
      roleDefinitionId: asn.roleDefinitionId,
      scope: asn.directoryScopeId,
      plane: 'entra',
    });
  }

  // Produce records — skip principals not in the index (e.g. deleted accounts)
  const records = [];
  for (const [pid, assignments] of byPrincipal.entries()) {
    const principal = principalIndex.get(pid);
    if (!principal) continue;
    records.push({ principal, assignments });
  }

  return records;
}
