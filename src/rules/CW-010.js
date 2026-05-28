// CW-010 — Cloud Application Administrator enables privilege escalation via app credential injection
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-010-cloud-application-administrator.yaml

export default {
  id: 'CW-010',
  name: 'Cloud Application Administrator enables privilege escalation via app credential injection',
  version: '1.0.0',
  severity: 'high',
  category: 'entra',
  plane: 'entra',
  tags: [
    'entra',
    'privilege-escalation',
    'credential-injection',
    'single-role',
    'service-principal-relevant',
  ],
  description:
    'The Cloud Application Administrator role in Microsoft Entra ID carries the same\n' +
    'credential-injection privilege escalation path as Application Administrator (CW-004).\n' +
    'A principal holding Cloud Application Administrator can add new credentials --\n' +
    'passwords (client secrets) and certificates -- to any application registration in the\n' +
    'tenant, regardless of what permissions that application holds. The only behavioral\n' +
    'difference from Application Administrator is that Cloud Application Administrator is\n' +
    'explicitly blocked from managing application proxy configuration and on-premises\n' +
    'connector settings; that distinction is irrelevant to the escalation described here.\n' +
    '\n' +
    'The escalation path is identical to CW-004: enumerate application registrations in the\n' +
    'tenant, identify one that has been granted privileged Microsoft Graph API permissions\n' +
    'with admin consent -- for example, RoleManagement.ReadWrite.Directory,\n' +
    'Application.ReadWrite.All, or Directory.ReadWrite.All -- inject a new client secret or\n' +
    'certificate onto that application registration, and authenticate to Microsoft Graph as\n' +
    'that application using the injected credential. If the target application holds\n' +
    'RoleManagement.ReadWrite.Directory, this leads directly to Global Administrator: the\n' +
    'principal can assign any directory role to any principal via the Graph API without ever\n' +
    'touching the Entra portal.\n' +
    '\n' +
    'See CW-004 for a full description of why this escalation surface is inherent to\n' +
    'virtually every production tenant, and why the role warrants high-severity treatment\n' +
    'regardless of whether a specific vulnerable application registration has been\n' +
    'identified in scan data.\n' +
    '\n' +
    'When Cloud Application Administrator is held by a service principal or managed\n' +
    'identity, the credential-injection step can be performed programmatically and without\n' +
    'human review, removing any portal-session friction that might otherwise generate a\n' +
    'visible audit event before the escalation completes.',

  principalFilter: {
    types: ['user', 'servicePrincipal', 'group', 'managedIdentity'],
  },

  requires: [
    {
      roleDefinitionId: '158c047a-c907-4556-b7ef-446551a6b5f7',
      roleName: 'Cloud Application Administrator',
      scopeBinding: 'A',
      plane: 'entra',
    },
  ],

  scopeSemantics: { inheritance: 'respect' },

  finding: {
    title: 'Principal holds Cloud Application Administrator',
    summary:
      '{{.principal.display_name}} holds the Cloud Application Administrator role in the ' +
      'Entra directory (scope: {{.scope.A.id}}). This role grants the ability to add ' +
      'credentials to any application registration in the tenant. A principal with this ' +
      'role can inject a client secret onto an existing application that holds privileged ' +
      'Microsoft Graph permissions, authenticate as that application, and assume its ' +
      'permissions -- potentially leading to Global Administrator if the target application ' +
      'holds RoleManagement.ReadWrite.Directory or equivalent.',
    remediationSummary:
      'Remove this role from the principal unless they are a designated application ' +
      'lifecycle administrator with an explicit operational need to manage cloud ' +
      'application registrations. Cloud Application Administrator should be assigned to ' +
      'only a small number of closely monitored accounts; service principals should not ' +
      'hold this role as a permanent active assignment.',
    remediationSteps: [
      'Determine whether this principal genuinely needs to manage application registrations in the tenant. For many use cases -- creating new app registrations but not managing existing ones -- the Application Developer role is sufficient and does not grant the ability to modify or add credentials to registrations the user did not create.',
      'Audit existing application registrations in the tenant for admin-consented Microsoft Graph permissions. Focus on applications holding RoleManagement.ReadWrite.Directory, Application.ReadWrite.All, Directory.ReadWrite.All, or User.ReadWrite.All -- these constitute the credential-injection escalation surface. Identify the owners and confirm that each such application\'s credential set is actively managed.',
      'For service principals or managed identities that legitimately require application management capabilities, do not use a permanent active Cloud Application Administrator assignment. Configure a Privileged Identity Management (PIM) eligible assignment with time-bound activation, MFA enforcement, and approval requirements.',
      'Review the Microsoft Entra audit log for application credential addition events performed by this principal. Filter for audit category \'ApplicationManagement\' and activity \'Update application - Certificates and secrets management\' or \'Add service principal credentials\' with this principal\'s object ID as the actor. These events would indicate the escalation path has already been exercised.',
    ],
    remediationCli: [
      '# List active directory role assignments for this principal to find the assignment ID\n' +
      'az rest \\\n' +
      '  --method GET \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq \'{{.principal.object_id}}\' and roleDefinitionId eq \'158c047a-c907-4556-b7ef-446551a6b5f7\'"',
      '# Remove the role assignment (replace {assignmentId} with the id from the query above)\n' +
      'az rest \\\n' +
      '  --method DELETE \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments/{assignmentId}"',
    ],
  },

  references: {
    microsoft: [
      'https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference',
      'https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals',
    ],
    mitreAttack: ['T1098.003', 'T1550'],
  },

  provenance: {
    added: '2026-05-13',
    addedBy: 'Initial rule set',
    lastReviewed: '2026-05-13',
  },
};
