import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW014 from './CW-014.js';

const SEC_ADMIN_ID   = '194ae4cb-b126-40b2-bd5b-6091b380977d';
const SEC_READER_ID  = '5d6b6bb7-de71-4623-b4af-96380a352509';

describe('CW-014 fixtures', () => {

  it('positive 1: user holds Security Administrator at scope /, plane entra -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000052', displayName: 'Chloe Example', type: 'user', upn: 'chloe@example.com' },
      assignments: [{ roleDefinitionId: SEC_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW014, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('negative 1: servicePrincipal holds Security Administrator -> NOT matched (CW-015 handles SPs)', () => {
    // CW-014 principalFilter covers user + group only.
    // A servicePrincipal with the same GUID must NOT match CW-014 -- it is detected by CW-015.
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000053', displayName: 'sec-admin-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000085' },
      assignments: [{ roleDefinitionId: SEC_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW014, record).matched).toBe(false);
  });

  it('negative 2: user holds Security Reader (wrong GUID) -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000054', displayName: 'Derek Example', type: 'user', upn: 'derek@example.com' },
      assignments: [{ roleDefinitionId: SEC_READER_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW014, record).matched).toBe(false);
  });

});
