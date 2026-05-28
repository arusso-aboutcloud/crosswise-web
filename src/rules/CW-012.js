// CW-012 — Conditional Access Administrator can disable MFA enforcement for any account
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-012-conditional-access-administrator.yaml

export default {
  id: 'CW-012',
  name: 'Conditional Access Administrator can disable MFA enforcement for any account',
  version: '1.0.0',
  severity: 'high',
  category: 'entra',
  plane: 'entra',
  tags: [
    'entra',
    'defense-evasion',
    'single-role',
    'authentication-weakening',
    'service-principal-relevant',
  ],
  description:
    'The Conditional Access Administrator role in Microsoft Entra ID grants the ability\n' +
    'to create, modify, and delete Conditional Access policies -- the mechanism enforcing\n' +
    'MFA, compliant device requirements, trusted location restrictions, and sign-in risk\n' +
    'controls across the tenant. A principal holding this role can create a CA policy\n' +
    'exclusion for any user account, including Global Administrators, removing MFA\n' +
    'enforcement for that account entirely without modifying any role assignment or\n' +
    'credential.\n' +
    '\n' +
    'This is a defense-evasion path, not a direct privilege escalation. The role does not\n' +
    'by itself confer elevated identity or directory permissions. The attack model is\n' +
    'indirect: create a CA policy exclusion for a target account, removing the MFA\n' +
    'cryptographic barrier, then rely on a separate password compromise of the target --\n' +
    'through phishing, password spray, credential breach data, or weak password policy --\n' +
    'to authenticate as that account. If the target account holds Global Administrator or\n' +
    'another privileged directory role, the result is effective tenant takeover via the\n' +
    'target\'s valid credentials, with no role manipulation and no credential injection.\n' +
    '\n' +
    'Microsoft\'s Entra security hardening guidance explicitly flags Conditional Access\n' +
    'Administrator as a role requiring governance equivalent to Global Administrator.\n' +
    'The reasoning is precise: CA policies are the primary layer through which the tenant\n' +
    'enforces authentication security for all users. A principal that can modify any CA\n' +
    'policy can silently remove the security controls protecting the most privileged\n' +
    'accounts in the directory, creating an exploitation window that may persist\n' +
    'indefinitely without being detected by controls that watch only for role assignment\n' +
    'changes or credential activity.\n' +
    '\n' +
    'When Conditional Access Administrator is held by a service principal or managed\n' +
    'identity, CA policy modifications can be performed programmatically and without\n' +
    'human review. Automated exclusion of privileged accounts from MFA policies -- whether\n' +
    'triggered by adversarial instructions or prompt injection -- produces no credential\n' +
    'event or role-assignment audit trail, making detection significantly harder than\n' +
    'equivalent operations that touch directory roles directly.',

  principalFilter: {
    types: ['user', 'servicePrincipal', 'group', 'managedIdentity'],
  },

  requires: [
    {
      roleDefinitionId: 'b1be1c3e-b65d-4f19-8427-f6fa0d97feb9',
      roleName: 'Conditional Access Administrator',
      scopeBinding: 'A',
      plane: 'entra',
    },
  ],

  scopeSemantics: { inheritance: 'respect' },

  finding: {
    title: 'Principal holds Conditional Access Administrator',
    summary:
      '{{.principal.display_name}} holds the Conditional Access Administrator role in the ' +
      'Entra directory (scope: {{.scope.A.id}}). This role grants the ability to create, ' +
      'modify, and delete Conditional Access policies, including MFA enforcement policies ' +
      'for any account. The principal can create a CA policy exclusion for any user -- ' +
      'including Global Administrators -- removing the MFA cryptographic barrier and ' +
      'leaving the account accessible via password alone if the password is compromised.',
    remediationSummary:
      'Treat this role with the same governance posture as Global Administrator. Remove it ' +
      'from service principals entirely. For human principals with a legitimate need to ' +
      'manage CA policies, replace the permanent active assignment with a Privileged ' +
      'Identity Management eligible assignment requiring approval and audit logging. Review ' +
      'existing CA policies for recent exclusions that may have been created as part of an ' +
      'exploitation attempt.',
    remediationSteps: [
      'Audit all existing Conditional Access policies for recent modifications, newly created exclusion conditions, or policy disablement. Filter the Microsoft Entra audit log for category \'Policy\' and activities \'Add conditional access policy\', \'Update conditional access policy\', and \'Delete conditional access policy\' to identify changes made by this principal.',
      'Determine whether this principal genuinely requires the ability to manage Conditional Access policies. CA policy management is a rare operational need that should be restricted to a small number of identity administrators. For most administrative tasks, purpose-specific roles are available that do not grant CA policy modification authority.',
      'If CA policy management capability is genuinely required, convert the permanent active assignment to a Privileged Identity Management (PIM) eligible assignment. Configure time-bound activation, MFA enforcement, and an approval workflow requiring a second administrator to authorize each activation. Audit logging of all CA policy changes should be reviewed as part of routine governance.',
      'For service principals and managed identities, this role must not be permanently assigned. CA policy modification cannot be safely delegated to an unattended identity. If automation requires CA policy interaction, redesign the workflow to route each policy change through a human-reviewed approval step.',
      'Review the tenant\'s CA policies to confirm that all privileged accounts -- including Global Administrators -- are covered by at least one active policy requiring MFA. Verify that no policy exclusion grants password-only access to any account holding a privileged directory role.',
    ],
    remediationCli: [
      '# List active directory role assignments for this principal to find the assignment ID\n' +
      'az rest \\\n' +
      '  --method GET \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq \'{{.principal.object_id}}\' and roleDefinitionId eq \'b1be1c3e-b65d-4f19-8427-f6fa0d97feb9\'"',
      '# Remove the role assignment (replace {assignmentId} with the id from the query above)\n' +
      'az rest \\\n' +
      '  --method DELETE \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments/{assignmentId}"',
    ],
  },

  references: {
    microsoft: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview',
    ],
    mitreAttack: ['T1562.001', 'T1078.004'],
  },

  provenance: {
    added: '2026-05-13',
    addedBy: 'Initial rule set',
    lastReviewed: '2026-05-13',
  },
};
