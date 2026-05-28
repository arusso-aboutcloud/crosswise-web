// CW-013 — Hybrid Identity Administrator enables escalation via sync rule manipulation
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-013-hybrid-identity-administrator.yaml

export default {
  id: 'CW-013',
  name: 'Hybrid Identity Administrator enables escalation via sync rule manipulation',
  version: '1.0.0',
  severity: 'critical',
  category: 'entra',
  plane: 'entra',
  tags: [
    'entra',
    'privilege-escalation',
    'hybrid-identity',
    'single-role',
    'service-principal-relevant',
  ],
  description:
    'The Hybrid Identity Administrator role in Microsoft Entra ID governs the configuration\n' +
    'of Microsoft Entra Connect (formerly AD Connect) and Entra Cloud Sync -- the mechanisms\n' +
    'that synchronize on-premises Active Directory identities to Entra ID. The role also\n' +
    'controls pass-through authentication (PTA), password hash synchronization (PHS),\n' +
    'seamless single sign-on, and federation settings.\n' +
    '\n' +
    'This role enables a well-documented hybrid-environment escalation path. A principal\n' +
    'holding Hybrid Identity Administrator can manipulate sync rules to map an attacker-\n' +
    'controlled on-premises account to a cloud-privileged Entra identity. The mechanics\n' +
    'are direct: modify the attribute flow rules in Entra Connect so that an on-prem AD\n' +
    'account the attacker controls is synchronized as a cloud account that holds a\n' +
    'privileged Entra directory role, then authenticate to Entra ID as that cloud identity\n' +
    'through normal sync mechanisms. Because the authentication event uses valid synced\n' +
    'credentials, it may not trigger anomaly detection controls that watch for unexpected\n' +
    'role assignments or credential changes.\n' +
    '\n' +
    'The escalation path is indirect -- it requires the attacker to hold or compromise an\n' +
    'on-premises AD account that the sync rule manipulation then elevates. In hybrid\n' +
    'environments, which represent the majority of enterprise Entra tenants, this\n' +
    'prerequisite is realistic. Domain-joined workstations, service accounts, and legacy\n' +
    'on-prem systems all constitute potential attacker-controlled on-prem accounts.\n' +
    '\n' +
    'Separately, the role\'s authority over federation and pass-through authentication\n' +
    'settings means a principal holding it can potentially redirect authentication flows\n' +
    'entirely -- configuring a federated identity provider the attacker controls as the\n' +
    'authority for a domain, causing Entra to accept authentication decisions from that\n' +
    'provider without verifying credentials independently.\n' +
    '\n' +
    'Microsoft\'s Entra security hardening guidance explicitly flags Hybrid Identity\n' +
    'Administrator as one of the most sensitive directory roles, requiring governance\n' +
    'equivalent to Global Administrator. The role is distinct from CW-011 (Privileged Role\n' +
    'Administrator, which enables direct self-assignment of Global Administrator via a\n' +
    'single API call) and CW-012 (Conditional Access Administrator, which weakens\n' +
    'authentication enforcement rather than elevating identity). CW-013 operates at the\n' +
    'identity synchronization and authentication configuration layer.\n' +
    '\n' +
    'When Hybrid Identity Administrator is held by a service principal or managed identity,\n' +
    'sync rule and federation configuration changes can be made programmatically without\n' +
    'human review, accelerating the exploitation timeline before detection controls fire.',

  principalFilter: {
    types: ['user', 'servicePrincipal', 'group', 'managedIdentity'],
  },

  requires: [
    {
      roleDefinitionId: '8ac3fc64-6eca-42ea-9e69-59f4c7b60eb2',
      roleName: 'Hybrid Identity Administrator',
      scopeBinding: 'A',
      plane: 'entra',
    },
  ],

  scopeSemantics: { inheritance: 'respect' },

  finding: {
    title: 'Principal holds Hybrid Identity Administrator',
    summary:
      '{{.principal.display_name}} holds the Hybrid Identity Administrator role in the ' +
      'Entra directory (scope: {{.scope.A.id}}). This role governs Entra Connect and Cloud ' +
      'Sync configuration. A principal with this role can manipulate sync rules to map an ' +
      'attacker-controlled on-premises AD account to a cloud-privileged Entra identity, ' +
      'then authenticate as that cloud identity through normal sync mechanisms, without ' +
      'any direct role assignment or credential injection.',
    remediationSummary:
      'Remove this role unless the principal is a designated hybrid identity administrator ' +
      'with an explicit, documented operational need to manage Entra Connect or Cloud Sync ' +
      'configuration. If hybrid identity management capability is genuinely required, replace ' +
      'the permanent active assignment with a Privileged Identity Management eligible ' +
      'assignment requiring approval, MFA activation, and a time limit. Never assign Hybrid ' +
      'Identity Administrator to a service principal or managed identity as a permanent ' +
      'active assignment under any circumstance. Treat any account holding this role as ' +
      'Tier 0 in the on-premises Active Directory identity tiering model.',
    remediationSteps: [
      'Determine whether this principal genuinely requires the ability to manage Entra Connect, Cloud Sync, or federation configuration. This is a rare operational need confined to hybrid identity administrators responsible for the directory synchronization infrastructure. For most administrative tasks, purpose-specific roles are available that do not grant sync or federation configuration authority.',
      'If hybrid identity management capability is genuinely required, convert the permanent active assignment to a Privileged Identity Management (PIM) eligible assignment. Configure time-bound activation, MFA enforcement, and an approval workflow requiring a second administrator to authorize each activation. Standing active access to this role should not exist under any operational circumstance.',
      'For service principals and managed identities, this role must not be permanently assigned under any operational circumstance. Sync rule and federation configuration changes made by an unattended identity cannot be safely reviewed before they take effect. Review whether the workload genuinely requires this capability; if it does, redesign the workflow to route each configuration change through a human-reviewed approval step.',
      'Treat any account or workload holding Hybrid Identity Administrator as Tier 0 in the on-premises Active Directory identity tiering model. The on-prem access prerequisite for the sync-rule escalation path means that the security boundary protecting this role extends to on-prem systems, not just cloud controls. Apply the same access restrictions, monitoring, and hardening you apply to Domain Admin accounts to any account that holds this role.',
      'Review the Microsoft Entra audit log for Entra Connect configuration events performed by this principal. Filter for audit category \'DirectorySync\' and activities related to connector or sync rule changes. Also review federation configuration changes under category \'Policy\' for domain trust modifications. Any changes to sync rules or federation settings should be treated as requiring investigation if performed outside a documented change window.',
    ],
    remediationCli: [
      '# List active directory role assignments for this principal to find the assignment ID\n' +
      'az rest \\\n' +
      '  --method GET \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq \'{{.principal.object_id}}\' and roleDefinitionId eq \'8ac3fc64-6eca-42ea-9e69-59f4c7b60eb2\'"',
      '# Remove the role assignment (replace {assignmentId} with the id from the query above)\n' +
      'az rest \\\n' +
      '  --method DELETE \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments/{assignmentId}"',
    ],
  },

  references: {
    microsoft: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-azure-ad-connect',
    ],
    mitreAttack: ['T1098.003', 'T1556'],
  },

  provenance: {
    added: '2026-05-14',
    addedBy: 'Initial rule set',
    lastReviewed: '2026-05-14',
  },
};
