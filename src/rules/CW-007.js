// CW-007 — AI agent or LLM-powered identity holds Application Administrator
// Ported verbatim from:
//   internal/scan/embedded_rules/CW-007-application-administrator-on-ai-agent.yaml
//
// principalFilter.properties.isAiAgent: true — matches engine.js principalAllowed()
// which reads props.isAiAgent (camelCase). Only SPs/MIs classified as AI agents match.
// The isAiAgent flag is set in src/collector.js via the AI_AGENT_APP_IDS allowlist.

export default {
  id: 'CW-007',
  name: 'AI agent or LLM-powered identity holds Application Administrator',
  version: '1.0.0',
  severity: 'critical',
  category: 'entra',
  plane: 'entra',
  tags: [
    'entra',
    'privilege-escalation',
    'credential-injection',
    'single-role',
    'ai-agent',
    'service-principal-relevant',
  ],
  description:
    'This rule extends CW-004 with AI-agent-specific concerns. CW-004 documents the\n' +
    'base risk: Application Administrator grants the ability to add credentials to any\n' +
    'application registration in the tenant, enabling a principal to inject a client\n' +
    'secret onto an existing application that holds privileged Microsoft Graph\n' +
    'permissions, authenticate as that application, and assume its permissions --\n' +
    'potentially reaching Global Administrator. That risk applies to any principal\n' +
    'holding the role. This rule addresses what changes when the principal is an\n' +
    'autonomous AI agent.\n' +
    '\n' +
    'Speed and scale. An LLM-powered automation can enumerate all application\n' +
    'registrations in the tenant, identify candidates with admin-consented privileged\n' +
    'Graph permissions, and inject a credential within seconds. Audit log ingestion\n' +
    'pipelines and SIEM alerting rules typically operate on time horizons of minutes\n' +
    'to tens of minutes; the escalation path can complete before any alert fires. A\n' +
    'human administrator performing the same sequence through the Entra portal would\n' +
    'take considerably longer and produce more visible, sequential activity.\n' +
    '\n' +
    'Absence of human review. Human administrators encounter friction at the moment\n' +
    'of action: portal confirmation dialogs, organizational norms, the cognitive load of\n' +
    'recalling whether a sensitive operation is appropriate in context. AI agents acting\n' +
    'on instructions do not pause at these moments. The credential-injection step that\n' +
    'would prompt a cautious human to verify intent is, from the agent\'s perspective,\n' +
    'just another API call in a sequence.\n' +
    '\n' +
    'Prompt injection attack surface. AI agents that consume external data -- email,\n' +
    'web pages, documents, database results, retrieval-augmented generation contexts --\n' +
    'can be induced to perform privileged operations by adversarially crafted content\n' +
    'embedded in those data sources. An attacker who controls any data source the agent\n' +
    'reads has a potential path to invoking the agent\'s Application Administrator\n' +
    'permissions without touching the agent\'s operator. CW-004 assumes the principal\n' +
    'acts only on instructions from its operator. CW-007 acknowledges that AI agents\n' +
    'also act on instructions embedded in the data they process.\n' +
    '\n' +
    'Continuous, unbounded execution. AI agents typically run as long-lived services\n' +
    'rather than episodically as a human admin would. Copilot agents, scheduled\n' +
    'automation, and retrieval pipelines may execute continuously for weeks or months.\n' +
    'An over-privileged human administrator\'s window of exploitation narrows when they\n' +
    'log off; an over-privileged AI agent\'s window does not close.\n' +
    '\n' +
    'Opacity of post-incident attribution. When an AI agent performs an unexpected\n' +
    'privileged action, the audit trail records which API call was made but not why the\n' +
    'model decided to make it. "The model decided to do X" is a materially less\n' +
    'actionable forensic finding than a human administrator\'s timestamped portal session.\n' +
    'Containment and root-cause analysis are correspondingly harder, and the prompt or\n' +
    'data source that triggered the action may no longer be accessible.\n' +
    '\n' +
    'Why this is a single-role rule. The same reasoning as CW-004 applies: the\n' +
    'schema cannot model "tenant contains at least one application registration with\n' +
    'privileged Graph permissions" as a rule precondition, and in practice that\n' +
    'precondition is true in virtually every production tenant. The base risk is real\n' +
    'regardless; the AI-agent context makes it categorically more dangerous.\n' +
    '\n' +
    'Why this is critical severity. The five amplification factors above -- speed,\n' +
    'absence of human review, prompt injection surface, continuous execution, and opaque\n' +
    'attribution -- collectively place an AI agent holding Application Administrator much\n' +
    'closer in practice to a permanently-compromised Global Administrator account than to\n' +
    'a misconfigured human admin. CW-004\'s "high" severity captures the base risk for\n' +
    'any principal; this rule\'s "critical" severity captures the amplified risk specific\n' +
    'to autonomous AI execution.\n' +
    '\n' +
    'This rule does not duplicate CW-004. Both rules will fire on an AI-agent service\n' +
    'principal or managed identity holding Application Administrator. CW-004 prompts\n' +
    'review of whether the role assignment is appropriate at all. CW-007 prompts a\n' +
    'categorical reassessment of whether AI agents should hold this role under any\n' +
    'operational circumstance -- and the answer is that they should not.',

  principalFilter: {
    types: ['servicePrincipal', 'managedIdentity'],
    properties: { isAiAgent: true },
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
    title: 'AI agent holds Application Administrator',
    summary:
      '{{.principal.display_name}} is classified as an AI agent and holds the Application ' +
      'Administrator role (scope: {{.scope.A.id}}). This role grants programmatic ' +
      'credential injection onto any application registration in the tenant. An LLM-powered ' +
      'identity with this capability can enumerate privileged application registrations, ' +
      'inject a client secret, and authenticate as that application -- completing the ' +
      'escalation path to Global Administrator at machine speed, without human review, ' +
      'and potentially in response to adversarially crafted prompt inputs.',
    remediationSummary:
      'AI agents must not hold Application Administrator under any operational ' +
      'circumstance. The role\'s credential-injection capability cannot be safely combined ' +
      'with autonomous AI execution. Remove the role immediately; if the agent requires ' +
      'application-management capability, redesign the workflow to route privileged ' +
      'operations through a human-reviewed identity.',
    remediationSteps: [
      'Confirm whether this principal is genuinely an AI agent (LLM-powered automation, Copilot agent, Azure AI Foundry or AzureML workspace identity, custom AI workload). The is_ai_agent classification should be reviewed for accuracy before acting on this finding.',
      'If the classification is correct, remove the Application Administrator role from this principal immediately. AI agents must not hold this role under any operational circumstance -- there is no safe configuration that combines autonomous AI execution with the ability to inject credentials onto arbitrary application registrations.',
      'Identify what task originally motivated this assignment. Common patterns include: app registration provisioning workflows (use a separate human-operated identity); credential rotation automation (use a Key Vault-based pattern with managed identity scoped to specific secrets, not Application Administrator); custom AI integration that programmatically manages apps (redesign to require human approval before each privileged operation).',
      'Audit the Microsoft Entra audit log for application credential addition events performed by this principal. Filter for audit category \'ApplicationManagement\' and activity \'Update application -- Certificates and secrets management\' or \'Add service principal credentials\' with this principal\'s object ID as the actor. Any such events should be treated as potential security incidents requiring investigation.',
      'Audit the AI agent\'s prompt logs and input data sources (where available) for content that may have induced privileged operations. Prompt injection from external data sources -- email, documents, web content, RAG retrieval results -- is a realistic attack vector for AI agents holding privileged roles.',
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
