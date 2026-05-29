/**
 * Known AI-agent service principal app IDs.
 *
 * Used by src/collector.js to set principal.isAiAgent on service principals
 * whose appId matches an entry here. CW-007 (AI agent + Application
 * Administrator) filters on that field.
 *
 * CURATION POLICY — read before adding an entry:
 *
 * There is no authoritative Microsoft API that classifies a service principal
 * as an "AI agent". This list is therefore curated by hand and updated only
 * via pull request. Entries are NEVER auto-populated at runtime.
 *
 * An incorrect or unsourced entry causes false positives in a security tool,
 * which erodes user trust. Every entry MUST supply a `source` field pointing
 * to verifiable Microsoft documentation (or other citable reference) that
 * confirms the appId belongs to an AI-agent service. PRs without a real
 * source URL will not be merged.
 *
 * To propose a new entry:
 *   1. Open a PR adding an object to AI_AGENT_APPS below.
 *   2. Include appId, name, and a `source` URL you have verified yourself.
 *   3. The validation test (src/data/ai-agent-app-ids.test.js) runs in CI and
 *      will fail if the entry is malformed or a duplicate.
 *   See CONTRIBUTING.md -- "Adding AI-agent app IDs" for the full process.
 *
 * Coverage note:
 *   This list covers only Microsoft first-party AI services whose app IDs are
 *   published in Microsoft documentation. Custom organizational AI agents
 *   (e.g. an enterprise chatbot built on Azure OpenAI) are NOT detected here;
 *   they are still caught by CW-004, which fires on any service principal
 *   holding Application Administrator regardless of AI classification.
 */

export const AI_AGENT_APPS = [
  {
    appId:  '9d8f559b-5984-46a4-902a-ad4271e83efa',
    name:   'Power Virtual Agents Service (Microsoft Copilot Studio)',
    source: 'https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-service-principal-table',
    // Listed under "Power Virtual Agents Service" (former name for Microsoft
    // Copilot Studio) in Microsoft's first-party app service principal
    // reference table. Verified 2026-05-29.
  },
  {
    appId:  '9315aedd-209b-43b3-b149-2abff6a95d59',
    name:   'Power Virtual Agents Service (Copilot Studio -- US Gov GCC)',
    source: 'https://learn.microsoft.com/en-us/power-platform/admin/apps-to-allow',
    // Listed as "PowerVirtualAgentsUSGovGCC" in Microsoft's Power Platform
    // commonly-used first-party services reference. Verified 2026-05-29.
  },
];

/**
 * Derived O(1) lookup set built once at module load.
 * Use this in the collector; iterate AI_AGENT_APPS only when provenance matters.
 */
export const AI_AGENT_APP_ID_SET = new Set(AI_AGENT_APPS.map(a => a.appId));
