// DEV-ONLY synthetic finding data for validating the finding-card render path.
// This file is only ever imported inside an import.meta.env.DEV guard in main.js,
// so Vite's dead-code elimination strips it from production builds entirely.
//
// Records use the exact shape the collector produces:
//   { principal: { id, displayName, type, appId?, isAiAgent? },
//     assignments: [{ roleDefinitionId, scope, plane }] }
//
// Role GUIDs are real (match the ported rule objects) so engine evaluation fires.
// Display names and IDs are obviously synthetic -- never confuse these with real findings.

export const demoRecords = [
  // -> CW-003 (critical): user holds Privileged Authentication Administrator
  {
    principal: {
      id: 'demo0000-0000-0000-0000-000000000001',
      displayName: 'Demo User Alice',
      type: 'user',
      upn: 'demo.alice@demo.example',
    },
    assignments: [
      { roleDefinitionId: '7be44c8a-adaf-4e2a-84d6-ab2649e08a13', scope: '/', plane: 'entra' },
    ],
  },

  // -> CW-007 (critical) + CW-004 (high): AI-agent SP holds Application Administrator.
  // Both rules fire intentionally -- CW-007 description notes they are complementary.
  {
    principal: {
      id: 'demo0000-0000-0000-0000-000000000002',
      displayName: 'demo-ai-agent-sp',
      type: 'servicePrincipal',
      appId: 'demo0000-0000-0000-0000-000000000092',
      isAiAgent: true,
    },
    assignments: [
      { roleDefinitionId: '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3', scope: '/', plane: 'entra' },
    ],
  },

  // -> CW-011 (critical): user holds Privileged Role Administrator
  {
    principal: {
      id: 'demo0000-0000-0000-0000-000000000003',
      displayName: 'Demo Role Admin Bob',
      type: 'user',
      upn: 'demo.bob@demo.example',
    },
    assignments: [
      { roleDefinitionId: 'e8611ab8-c189-46e8-94e1-60213ab1f814', scope: '/', plane: 'entra' },
    ],
  },

  // -> CW-014 (medium): user holds Security Administrator
  {
    principal: {
      id: 'demo0000-0000-0000-0000-000000000004',
      displayName: 'Demo Security Admin',
      type: 'user',
      upn: 'demo.sec@demo.example',
    },
    assignments: [
      { roleDefinitionId: '194ae4cb-b126-40b2-bd5b-6091b380977d', scope: '/', plane: 'entra' },
    ],
  },

  // -> CW-015 (high): service principal holds Security Administrator
  {
    principal: {
      id: 'demo0000-0000-0000-0000-000000000005',
      displayName: 'demo-sec-admin-sp',
      type: 'servicePrincipal',
      appId: 'demo0000-0000-0000-0000-000000000091',
      isAiAgent: false,
    },
    assignments: [
      { roleDefinitionId: '194ae4cb-b126-40b2-bd5b-6091b380977d', scope: '/', plane: 'entra' },
    ],
  },
];
