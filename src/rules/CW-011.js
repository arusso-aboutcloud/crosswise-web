// CW-011 — Privileged Role Administrator enables direct escalation to Global Administrator
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-011-privileged-role-administrator.yaml

export default {
  id: 'CW-011',
  name: 'Privileged Role Administrator enables direct escalation to Global Administrator',
  version: '1.0.0',
  severity: 'critical',
  category: 'entra',
  plane: 'entra',
  tags: [
    'entra',
    'privilege-escalation',
    'single-role',
    'tenant-takeover',
    'service-principal-relevant',
  ],
  description:
    'The Privileged Role Administrator role in Microsoft Entra ID grants\n' +
    'roleManagement/directory/roleAssignments/allProperties/allTasks -- full authority\n' +
    'to create, modify, and delete any Entra directory role assignment, including Global\n' +
    'Administrator. A principal holding this role can assign Global Administrator to itself\n' +
    'or any other account in a single Microsoft Graph API call, with no credential\n' +
    'manipulation, no application registration, and no password reset of another account.\n' +
    '\n' +
    'This is the most direct single-role privilege escalation path in the Entra directory\n' +
    'surface. It is more direct than Privileged Authentication Administrator (CW-003),\n' +
    'which requires resetting another account\'s password before assuming that account\'s\n' +
    'permissions. It is more direct than Application Administrator (CW-004) and Cloud\n' +
    'Application Administrator (CW-010), which require an existing application registration\n' +
    'with privileged Graph permissions as an escalation intermediary. Privileged Role\n' +
    'Administrator requires none of these preconditions: the role alone, in a single API\n' +
    'call, yields Global Administrator.\n' +
    '\n' +
    'The role is sometimes granted to IT administrators as an alternative to Global\n' +
    'Administrator for role-management tasks -- on the premise that it is more limited\n' +
    'because it does not carry all of Global Admin\'s other permissions. That reasoning\n' +
    'is operationally incorrect: a Privileged Role Administrator can assign itself Global\n' +
    'Administrator at any moment, making the practical security posture equivalent to\n' +
    'holding Global Administrator directly. The gap is that this self-assignment may not\n' +
    'be flagged by controls that monitor for standing Global Administrator assignments,\n' +
    'because the role appears unassigned until the moment it is exercised.\n' +
    '\n' +
    'When Privileged Role Administrator is held by a service principal or managed\n' +
    'identity, the Global Administrator self-assignment can be performed programmatically\n' +
    'and without human review, completing the escalation before any alert fires.',

  principalFilter: {
    types: ['user', 'servicePrincipal', 'group', 'managedIdentity'],
  },

  requires: [
    {
      roleDefinitionId: 'e8611ab8-c189-46e8-94e1-60213ab1f814',
      roleName: 'Privileged Role Administrator',
      scopeBinding: 'A',
      plane: 'entra',
    },
  ],

  scopeSemantics: { inheritance: 'respect' },

  finding: {
    title: 'Principal holds Privileged Role Administrator',
    summary:
      '{{.principal.display_name}} holds the Privileged Role Administrator role in the ' +
      'Entra directory (scope: {{.scope.A.id}}). This role grants full authority over all ' +
      'Entra directory role assignments, including Global Administrator. The principal can ' +
      'assign Global Administrator to itself or any other account in a single Graph API ' +
      'call, with no credential manipulation and no additional preconditions.',
    remediationSummary:
      'Remove this role unless the principal is a designated role-management account with ' +
      'an explicit, documented operational need. If role management capability is genuinely ' +
      'required, replace the permanent active assignment with a Privileged Identity ' +
      'Management eligible assignment requiring approval, MFA activation, and a time limit. ' +
      'Never assign Privileged Role Administrator to a service principal or managed identity ' +
      'as a permanent active assignment under any circumstance.',
    remediationSteps: [
      'Determine whether this principal genuinely requires the ability to manage Entra directory role assignments. This is a rare operational need. For most administrative tasks -- including user management, group management, and application management -- purpose-specific roles are available that do not grant role-assignment authority.',
      'If role-management capability is genuinely required, convert the permanent active assignment to a Privileged Identity Management (PIM) eligible assignment. Configure time-bound activation, MFA enforcement, and an approval workflow requiring a second administrator to authorize each activation. Standing active access to this role should not exist under any operational circumstance.',
      'For service principals and managed identities, this role must not be permanently assigned under any operational circumstance. The ability to assign Global Administrator via a single programmatic API call cannot be safely held by an unattended identity. Review whether the workload genuinely requires role-assignment capability; if it does, redesign the workflow to route each role assignment through a human-reviewed approval step.',
      'Review the Microsoft Entra audit log for directory role assignment events performed by this principal. Filter for audit category \'RoleManagement\' and activity \'Add member to role\' with this principal\'s object ID as the actor. Any assignments to highly privileged roles (Global Administrator, Privileged Authentication Administrator, Application Administrator) should be treated as potential security incidents requiring investigation.',
    ],
    remediationCli: [
      '# List active directory role assignments for this principal to find the assignment ID\n' +
      'az rest \\\n' +
      '  --method GET \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq \'{{.principal.object_id}}\' and roleDefinitionId eq \'e8611ab8-c189-46e8-94e1-60213ab1f814\'"',
      '# Remove the role assignment (replace {assignmentId} with the id from the query above)\n' +
      'az rest \\\n' +
      '  --method DELETE \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments/{assignmentId}"',
    ],
  },

  references: {
    microsoft: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/delegate-by-task',
    ],
    mitreAttack: ['T1098.003', 'T1078.004'],
  },

  provenance: {
    added: '2026-05-13',
    addedBy: 'Initial rule set',
    lastReviewed: '2026-05-13',
  },
};
