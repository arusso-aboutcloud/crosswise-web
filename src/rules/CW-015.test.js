import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW015 from './CW-015.js';

const SEC_ADMIN_ID   = '194ae4cb-b126-40b2-bd5b-6091b380977d';
const SEC_READER_ID  = '5d6b6bb7-de71-4623-b4af-96380a352509';

describe('CW-015 fixtures', () => {

  it('positive 1: servicePrincipal holds Security Administrator at scope /, plane entra -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000055', displayName: 'sec-ops-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000084' },
      assignments: [{ roleDefinitionId: SEC_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW015, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('negative 1: user holds Security Administrator -> NOT matched (CW-014 handles users)', () => {
    // CW-015 principalFilter covers servicePrincipal + managedIdentity only.
    // A user with the same GUID must NOT match CW-015 -- it is detected by CW-014.
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000056', displayName: 'Elaine Example', type: 'user', upn: 'elaine@example.com' },
      assignments: [{ roleDefinitionId: SEC_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW015, record).matched).toBe(false);
  });

  it('negative 2: servicePrincipal holds Security Reader (wrong GUID) -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000057', displayName: 'sec-reader-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000083' },
      assignments: [{ roleDefinitionId: SEC_READER_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW015, record).matched).toBe(false);
  });

});
