// CW-004 — Application Administrator enables privilege escalation via app credential injection
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-004-application-administrator.yaml

export default {
  id: 'CW-004',
  name: 'Application Administrator enables privilege escalation via app credential injection',
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
    'The Application Administrator role in Microsoft Entra ID grants the ability to create,\n' +
    'modify, and delete all application registrations and enterprise applications in the\n' +
    'tenant. Critically, the role explicitly grants permission to add new credentials --\n' +
    'passwords (client secrets) and certificates -- to any application registration,\n' +
    'regardless of what permissions that application holds.\n' +
    '\n' +
    'This capability enables a well-documented privilege escalation path. A principal\n' +
    'holding Application Administrator can enumerate existing application registrations in\n' +
    'the tenant, identify one that has been granted privileged Microsoft Graph API\n' +
    'permissions with admin consent -- for example, RoleManagement.ReadWrite.Directory,\n' +
    'Application.ReadWrite.All, Directory.ReadWrite.All, or User.ReadWrite.All -- inject a\n' +
    'new client secret or certificate onto that application registration, and then\n' +
    'authenticate to Microsoft Graph as that application using the injected credential.\n' +
    'The principal has now effectively assumed the identity and permissions of the target\n' +
    'application. If the application holds RoleManagement.ReadWrite.Directory, this leads\n' +
    'directly to Global Administrator: the attacker can assign any directory role to any\n' +
    'principal via the Graph API without ever touching the Entra portal.\n' +
    '\n' +
    'This escalation path is not well-mitigated by least-privilege design at the role\n' +
    'assignment level. Real Entra tenants almost universally contain at least one\n' +
    'application registration with broad Graph permissions: ServiceNow and other ITSM\n' +
    'integrations, SailPoint or other identity governance connectors, custom automation\n' +
    'and scripting workloads, and Microsoft first-party applications all routinely hold\n' +
    'powerful admin-consented Graph permissions. The escalation surface is inherent to\n' +
    'the tenant\'s operational posture, not to any misconfiguration that can easily be\n' +
    'remediated. Application Administrator plus the existence of even one such application\n' +
    'is functionally equivalent to tenant takeover.\n' +
    '\n' +
    'This rule flags Application Administrator as a single-role high-severity finding\n' +
    'because the schema cannot model "tenant contains a privileged application registration"\n' +
    'as a rule precondition -- and in practice that precondition is true in virtually every\n' +
    'production tenant. Waiting for the combination to be confirmed in scan data would\n' +
    'produce a false sense of safety. The role is dangerous in any realistic environment\n' +
    'and should be treated accordingly.\n' +
    '\n' +
    'Application Administrator is distinct from Cloud Application Administrator, which\n' +
    'carries the same credential-injection escalation path but is explicitly blocked from\n' +
    'managing application proxy configuration and on-premises connector settings. That\n' +
    'distinction does not affect the escalation described here; a separate rule may cover\n' +
    'Cloud Application Administrator in the future.\n' +
    '\n' +
    'When Application Administrator is held by a service principal or managed identity,\n' +
    'the credential-injection step can be performed programmatically and without human\n' +
    'review, removing any portal-session friction that might otherwise generate a visible\n' +
    'audit event before the escalation completes.',

  principalFilter: {
    types: ['user', 'servicePrincipal', 'group', 'managedIdentity'],
  },

  requires: [
    {
      roleDefinitionId: '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3',
      roleName: 'Application Administrator',
      scopeBinding: 'A',
      plane: 'entra',
    },
  ],

  scopeSemantics: { inheritance: 'respect' },

  finding: {
    title: 'Principal holds Application Administrator',
    summary:
      '{{.principal.display_name}} holds the Application Administrator role in the Entra ' +
      'directory (scope: {{.scope.A.id}}). This role grants the ability to add credentials ' +
      'to any application registration in the tenant. A principal with this role can inject ' +
      'a client secret onto an existing application that holds privileged Microsoft Graph ' +
      'permissions, authenticate as that application, and assume its permissions -- ' +
      'potentially leading to Global Administrator if the target application holds ' +
      'RoleManagement.ReadWrite.Directory or equivalent.',
    remediationSummary:
      'Remove this role from the principal unless they are a designated application ' +
      'lifecycle administrator with an explicit operational need to manage all application ' +
      'registrations in the tenant. Application Administrator should be assigned to only ' +
      'a small number of closely monitored accounts; service principals should not hold ' +
      'this role as a permanent active assignment.',
    remediationSteps: [
      'Determine whether this principal genuinely needs to manage all application registrations in the tenant. For many use cases -- creating new app registrations but not managing existing ones -- the Application Developer role is sufficient and does not grant the ability to modify or add credentials to registrations the user did not create.',
      'Audit existing application registrations in the tenant for admin-consented Microsoft Graph permissions. Focus on applications holding RoleManagement.ReadWrite.Directory, Application.ReadWrite.All, Directory.ReadWrite.All, or User.ReadWrite.All -- these constitute the credential-injection escalation surface. Identify the owners and confirm that each such application\'s credential set is actively managed.',
      'For service principals or managed identities that legitimately require application management capabilities, do not use a permanent active Application Administrator assignment. Configure a Privileged Identity Management (PIM) eligible assignment with time-bound activation, MFA enforcement, and approval requirements.',
      'Review the Microsoft Entra audit log for application credential addition events performed by this principal. Filter for audit category \'ApplicationManagement\' and activity \'Update application – Certificates and secrets management\' or \'Add service principal credentials\' with this principal\'s object ID as the actor. These events would indicate the escalation path has already been exercised.',
    ],
    remediationCli: [
      '# List active directory role assignments for this principal to find the assignment ID\n' +
      'az rest \\\n' +
      '  --method GET \\\n' +
      '  --url "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\\$filter=principalId eq \'{{.principal.object_id}}\' and roleDefinitionId eq \'9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3\'"',
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
    added: '2026-05-04',
    addedBy: 'Initial rule set',
    lastReviewed: '2026-05-04',
  },
};
