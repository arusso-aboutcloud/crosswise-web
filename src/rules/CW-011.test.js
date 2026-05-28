import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW011 from './CW-011.js';

const PRIV_ROLE_ADMIN_ID = 'e8611ab8-c189-46e8-94e1-60213ab1f814';
const USER_ADMIN_ID      = 'fe930be7-5d62-42d1-8ac9-19ce0027cb15';

describe('CW-011 fixtures', () => {

  it('positive 1: user holds Privileged Role Administrator at scope /, plane entra -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000041', displayName: 'Uma Example', type: 'user', upn: 'uma@example.com' },
      assignments: [{ roleDefinitionId: PRIV_ROLE_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW011, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('positive 2: servicePrincipal holds Privileged Role Administrator -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000042', displayName: 'role-mgmt-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000088' },
      assignments: [{ roleDefinitionId: PRIV_ROLE_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW011, record).matched).toBe(true);
  });

  it('negative 1: user holds User Administrator (wrong GUID) -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000043', displayName: 'Victor Example', type: 'user', upn: 'victor@example.com' },
      assignments: [{ roleDefinitionId: USER_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW011, record).matched).toBe(false);
  });

  it('negative 2: user holds correct GUID but plane azure -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000044', displayName: 'Wendy Example', type: 'user', upn: 'wendy@example.com' },
      assignments: [{ roleDefinitionId: PRIV_ROLE_ADMIN_ID, scope: '/', plane: 'azure' }],
    };
    expect(evaluateRule(CW011, record).matched).toBe(false);
  });

});
