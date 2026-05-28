import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW012 from './CW-012.js';

const CA_ADMIN_ID  = 'b1be1c3e-b65d-4f19-8427-f6fa0d97feb9';
const SEC_ADMIN_ID = '194ae4cb-b126-40b2-bd5b-6091b380977d';

describe('CW-012 fixtures', () => {

  it('positive 1: user holds Conditional Access Administrator at scope /, plane entra -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000045', displayName: 'Xavier Example', type: 'user', upn: 'xavier@example.com' },
      assignments: [{ roleDefinitionId: CA_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW012, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('positive 2: servicePrincipal holds Conditional Access Administrator -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000046', displayName: 'ca-policy-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000087' },
      assignments: [{ roleDefinitionId: CA_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW012, record).matched).toBe(true);
  });

  it('negative 1: user holds Security Administrator (wrong GUID) -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000047', displayName: 'Yara Example', type: 'user', upn: 'yara@example.com' },
      assignments: [{ roleDefinitionId: SEC_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW012, record).matched).toBe(false);
  });

  it('negative 2: user holds correct GUID but plane azure -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000048', displayName: 'Zoe Example', type: 'user', upn: 'zoe@example.com' },
      assignments: [{ roleDefinitionId: CA_ADMIN_ID, scope: '/', plane: 'azure' }],
    };
    expect(evaluateRule(CW012, record).matched).toBe(false);
  });

});
