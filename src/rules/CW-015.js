// CW-015 — Security Administrator on service principal
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-015-security-administrator-service-principal.yaml
//
// NOTE: CW-014 and CW-015 share the SAME role GUID (Security Administrator,
// 194ae4cb-b126-40b2-bd5b-6091b380977d) but have different principalFilter.types.
// CW-014 covers user + group (medium severity).
// CW-015 covers servicePrincipal + managedIdentity (high severity).

export default {
  id: 'CW-015',
  name: 'Security Administrator on service principal',
  version: '1.0.0',
  severity: 'high',
  category: 'entra',
  plane: 'entra',
  tags: [
    'entra',
    'defense-evasion',
    'security-tooling',
    'single-role',
    'service-principal-relevant',
  ],
  description:
    'The Security Administrator role in Microsoft Entra ID grants the ability to dismiss\n' +
    'alerts in Microsoft Defender XDR, modify Defender for Cloud security configurations,\n' +
    'modify Identity Protection risk policies, and manage security-related Conditional\n' +
    'Access policy types. When held by a service principal or managed identity, these\n' +
    'capabilities can be exercised programmatically without human review, removing any\n' +
    'analyst friction that would otherwise slow down or surface the modification.\n' +
    '\n' +
    'No legitimate operational case exists for a service principal or managed identity\n' +
    'to hold Security Administrator as a permanent active assignment. Security operations\n' +
    'functions -- alert triage, threat investigation, detection configuration, Identity\n' +
    'Protection risk policy management -- are interactive, human-review-driven workflows.\n' +
    'Automation pipelines that touch security tooling do so through purpose-built APIs\n' +
    'with narrower scope than Security Administrator, not through directory roles that\n' +
    'grant alert dismissal authority.\n' +
    '\n' +
    'A service principal holding Security Administrator is almost always one of three\n' +
    'cases: over-permissioned during initial setup and not subsequently reviewed;\n' +
    'reused for a purpose beyond its original scope; or deliberately assigned by an\n' +
    'attacker who has compromised the service principal\'s credentials. In all three\n' +
    'cases, the effective risk is the same -- programmatic, unattended modification\n' +
    'of the tenant\'s security detection and response posture.\n' +
    '\n' +
    'This rule is the service-principal-specific counterpart to CW-014, which detects\n' +
    'Security Administrator on user and group principals at Medium severity. The severity\n' +
    'is elevated to High here because the no-legitimate-use-case calculus that applies\n' +
    'to service principals differs from the human case: for human security team members,\n' +
    'a finding is typically resolved by documenting an intentional and appropriate\n' +
    'assignment; for service principals, a finding almost always requires removal or\n' +
    'significant scope reduction. The underlying defense-evasion capability of the role\n' +
    'is identical -- only the principal context and the severity calibration differ.',

  principalFilter: {
    types: ['servicePrincipal', 'managedIdentity'],
  },

  requires: [
    {
      roleDefinitionId: '194ae4cb-b126-40b2-bd5b-6091b380977d',
      roleName: 'Security Administrator',
      scopeBinding: 'A',
      plane: 'entra',
    },
  ],

  scopeSemantics: { inheritance: 'respect' },

  finding: {
    title: 'Security Administrator assigned to service principal',
    summary:
      '{{.principal.display_name}} holds the Security Administrator role in the Entra ' +
      'directory (scope: {{.scope.A.id}}). This service principal can dismiss alerts in ' +
      'Microsoft Defender XDR, modify Defender for Cloud security configurations, and ' +
      'modify Identity Protection risk policies programmatically and without human review. ' +
      'No legitimate operational case exists for a service principal to hold this role as ' +
      'a permanent active assignment. Review and likely remove.',
    remediationSummary:
      'Remove this role assignment unless an explicit, documented operational case can be ' +
      'provided. No legitimate automation pattern requires permanent active Security ' +
      'Administrator on a service principal. Investigate whether the assignment is the ' +
      'result of over-permissioning, scope creep, or credential compromise. User and group ' +
      'principal assignments of this role are detected by CW-014 at Medium severity, ' +
      'reflecting the legitimate use case for human security operations teams that does ' +
      'not exist for service principals.',
    remediationSteps: [
      'Identify the purpose of this service principal and determine which system or team owns it. Investigate one of three likely explanations: (a) over-permissioned during initial setup and not subsequently reviewed -- check the assignment creation date and actor in the Entra audit log; (b) reused for a purpose beyond its original scope -- compare the current role against the workload\'s documented requirements; (c) deliberately assigned by an attacker who compromised the service principal\'s credentials -- check sign-in logs for authentication from unexpected IPs, client applications, or times.',
      'In the common case, remove the Security Administrator assignment immediately. If the workload has a genuine operational need that touches security tooling, identify the specific Microsoft Graph permission or narrower role that satisfies that need without granting alert dismissal and detection configuration authority.',
      'If a documented operational justification exists and Security Administrator cannot be replaced with a narrower permission, convert the permanent active assignment to a Privileged Identity Management (PIM) eligible assignment. Configure time-bound activation, MFA enforcement at activation, and an approval workflow requiring a human reviewer to authorize each activation. An unattended identity should never hold standing active access to this role.',
      'Review the Microsoft Entra audit log for Defender XDR alert dismissal events, Defender for Cloud configuration changes, and Identity Protection policy modifications performed by this service principal. Any configuration change that reduces detection coverage, suppresses active alerts, or weakens risk-based enforcement should be treated as a potential indicator of compromise requiring incident investigation.',
      'Rotate the service principal\'s credentials regardless of which explanation applies. If the assignment was the result of credential compromise, credential rotation stops the attacker\'s active access. If the assignment was over-permissioning or scope creep, rotation is good hygiene before the role is removed.',
    ],
    remediationCli: [
      '# List active directory role assignments for this principal to find the assignment ID\n' +
      'az rest \\\n' +
      '  --method GET \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq \'{{.principal.object_id}}\' and roleDefinitionId eq \'194ae4cb-b126-40b2-bd5b-6091b380977d\'"',
      '# Remove the role assignment (replace {assignmentId} with the id from the query above)\n' +
      'az rest \\\n' +
      '  --method DELETE \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments/{assignmentId}"',
    ],
  },

  references: {
    microsoft: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
    ],
    mitreAttack: ['T1562.001'],
  },

  provenance: {
    added: '2026-05-14',
    addedBy: 'Initial rule set',
    lastReviewed: '2026-05-14',
  },
};
