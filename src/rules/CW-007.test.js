import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW007 from './CW-007.js';

const APP_ADMIN_ID = '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3';

describe('CW-007 fixtures', () => {

  it('positive 1: servicePrincipal with isAiAgent:true holds Application Administrator -> matched', () => {
    // Canonical AI-agent case: LLM-powered automation or Copilot agent with
    // credential-injection capability. isAiAgent:true is the discriminating property.
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000023',
        displayName: 'ai-app-mgmt-agent',
        type: 'servicePrincipal',
        appId: '00000000-0000-0000-0000-000000000098',
        isAiAgent: true,
      },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW007, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('positive 2: managedIdentity with isAiAgent:true holds Application Administrator -> matched', () => {
    // Azure-resource-attached AI workload (AzureML, Container App, Function).
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000024',
        displayName: 'ai-foundry-workspace-mi',
        type: 'managedIdentity',
        isAiAgent: true,
      },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW007, record).matched).toBe(true);
  });

  it('negative 1: servicePrincipal with isAiAgent:false holds App Admin -> NOT matched (CW-004 fires instead)', () => {
    // KEY DISCRIMINATION TEST: same role, same type, but isAiAgent:false.
    // CW-007 must not match -- only AI-classified SPs trigger it.
    // CW-004 fires on this principal at high severity; CW-007 does not.
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000025',
        displayName: 'app-mgmt-sp-non-agent',
        type: 'servicePrincipal',
        appId: '00000000-0000-0000-0000-000000000094',
        isAiAgent: false,
      },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW007, record).matched).toBe(false);
  });

  it('negative 2: user with isAiAgent:true holds App Admin -> NOT matched (type filter excludes users)', () => {
    // principalFilter.types contains only servicePrincipal and managedIdentity.
    // A user principal must not match even if isAiAgent is true -- type filter takes precedence.
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000026',
        displayName: 'Mia Example',
        type: 'user',
        upn: 'mia@example.com',
        isAiAgent: true,
      },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW007, record).matched).toBe(false);
  });

});
