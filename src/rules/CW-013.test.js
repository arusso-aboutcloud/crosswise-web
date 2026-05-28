import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW013 from './CW-013.js';

const HYBRID_IDENTITY_ADMIN_ID   = '8ac3fc64-6eca-42ea-9e69-59f4c7b60eb2';
const DIR_SYNC_ACCOUNTS_ID       = 'd29b2b05-8046-44ba-8758-1e26182fcf32';

describe('CW-013 fixtures', () => {

  it('positive 1: user holds Hybrid Identity Administrator at scope /, plane entra -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000049', displayName: 'Aaron Example', type: 'user', upn: 'aaron@example.com' },
      assignments: [{ roleDefinitionId: HYBRID_IDENTITY_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW013, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('positive 2: servicePrincipal holds Hybrid Identity Administrator -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000050', displayName: 'hybrid-sync-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000086' },
      assignments: [{ roleDefinitionId: HYBRID_IDENTITY_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW013, record).matched).toBe(true);
  });

  it('negative 1: user holds Directory Synchronization Accounts (wrong GUID) -> not matched', () => {
    // Directory Synchronization Accounts is sync-related but does not grant sync-rule
    // or federation configuration authority. Different role_definition_id.
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000051', displayName: 'Beth Example', type: 'user', upn: 'beth@example.com' },
      assignments: [{ roleDefinitionId: DIR_SYNC_ACCOUNTS_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW013, record).matched).toBe(false);
  });

});
