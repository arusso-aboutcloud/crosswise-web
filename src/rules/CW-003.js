// CW-003 — Privileged Authentication Administrator enables Global Admin password reset
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-003-privileged-authentication-administrator.yaml
// Field mapping: YAML snake_case -> JS camelCase keys; all values copied verbatim.

export default {
  id: 'CW-003',
  name: 'Privileged Authentication Administrator enables Global Admin password reset',
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
    'The Privileged Authentication Administrator role in Microsoft Entra ID grants the\n' +
    'ability to reset passwords and manage authentication methods for any user in the\n' +
    'tenant — including users who hold the Global Administrator role. This makes the\n' +
    'role functionally equivalent to Global Administrator: a principal holding it can\n' +
    'reset a Global Admin\'s password, sign in as that admin, and assume full tenant\n' +
    'control without being directly assigned the Global Admin role.\n' +
    '\n' +
    'This role is distinct from the Authentication Administrator role. Authentication\n' +
    'Administrator can only manage authentication methods for non-privileged users; it\n' +
    'is explicitly blocked from managing accounts that hold directory roles. The\n' +
    '"Privileged" qualifier in Privileged Authentication Administrator denotes exactly\n' +
    'this expanded scope — the ability to act on privileged accounts. The name is\n' +
    'frequently misread as a more secure or more restricted variant of Authentication\n' +
    'Administrator, when in fact it is significantly more powerful.\n' +
    '\n' +
    'The role is particularly dangerous when assigned to service principals or managed\n' +
    'identities. These identities can invoke the password-reset capability programmatically\n' +
    'at any time, without the human friction of a portal session or an approval workflow.\n' +
    'A compromised service principal holding this role can silently reset a Global Admin\'s\n' +
    'password and exfiltrate the credential before any alert fires.\n' +
    '\n' +
    'Unlike most privilege escalation paths that require combining two roles, this is a\n' +
    'single-role risk: the Privileged Authentication Administrator role alone is sufficient\n' +
    'to take over the tenant.',

  principalFilter: {
    types: ['user', 'servicePrincipal', 'group', 'managedIdentity'],
  },

  requires: [
    {
      roleDefinitionId: '7be44c8a-adaf-4e2a-84d6-ab2649e08a13',
      roleName: 'Privileged Authentication Administrator',
      scopeBinding: 'A',
      plane: 'entra',
    },
  ],

  scopeSemantics: {
    inheritance: 'respect',
  },

  finding: {
    title: 'Principal holds Privileged Authentication Administrator',
    summary:
      '{{.principal.display_name}} holds the Privileged Authentication Administrator ' +
      'role in the Entra directory (scope: {{.scope.A.id}}). This role grants the ' +
      'ability to reset passwords and manage authentication methods for any user in ' +
      'the tenant, including Global Administrators. The principal can reset a Global ' +
      'Admin\'s password and assume full tenant control.',
    remediationSummary:
      'Remove this role unless the principal is a designated emergency-access account. ' +
      'If the intent is to manage authentication methods for non-admin users, replace ' +
      'it with the Authentication Administrator role, which is explicitly scoped to ' +
      'non-privileged accounts. For service principals and managed identities, this ' +
      'role should never be a permanent active assignment.',
    remediationSteps: [
      'Confirm whether this principal is a designated break-glass or emergency-access account. If it is not, remove the Privileged Authentication Administrator role immediately.',
      'If the principal is a break-glass account, convert the assignment to a Privileged Identity Management (PIM) eligible assignment rather than a permanent active one. Require approval, MFA, and time-bound activation.',
      'If the goal is to manage authentication methods for regular (non-admin) users only, replace Privileged Authentication Administrator with the Authentication Administrator role. Authentication Administrator is blocked from acting on accounts that hold directory roles.',
      'For service principals and managed identities, this role should not be permanently assigned. Review whether the workload genuinely requires password reset capability; if so, redesign using delegated user flows rather than a privileged directory role.',
      'Review the Microsoft Entra audit log for password reset and authentication method change events performed by this principal. Filter for activity type \'Reset user password\' and \'Update user\' in the audit log with this principal\'s object ID as the actor.',
    ],
    remediationCli: [
      '# List active directory role assignments for this principal to find the assignment ID\n' +
      'az rest \\\n' +
      '  --method GET \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq \'{{.principal.object_id}}\' and roleDefinitionId eq \'7be44c8a-adaf-4e2a-84d6-ab2649e08a13\'"',
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
    mitreAttack: [
      'T1098.003',
      'T1078.004',
    ],
  },

  provenance: {
    added: '2026-04-29',
    addedBy: 'Initial rule set',
    lastReviewed: '2026-04-29',
  },
};
