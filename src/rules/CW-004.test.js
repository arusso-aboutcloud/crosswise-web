import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW004 from './CW-004.js';

const APP_ADMIN_ID        = '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3';
const CLOUD_APP_ADMIN_ID  = '158c047a-c907-4556-b7ef-446551a6b5f7';

describe('CW-004 fixtures', () => {

  it('positive 1: user holds Application Administrator at scope /, plane entra -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000011', displayName: 'Ivan Example', type: 'user', upn: 'ivan@example.com' },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW004, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('positive 2: servicePrincipal holds Application Administrator -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000012', displayName: 'app-mgmt-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000099' },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW004, record);
    expect(result.matched).toBe(true);
  });

  it('negative 1: user holds Cloud Application Administrator (wrong GUID) -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000013', displayName: 'Jane Example', type: 'user', upn: 'jane@example.com' },
      assignments: [{ roleDefinitionId: CLOUD_APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW004, record).matched).toBe(false);
  });

  it('negative 2: user holds correct GUID but plane azure -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000014', displayName: 'Karl Example', type: 'user', upn: 'karl@example.com' },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'azure' }],
    };
    expect(evaluateRule(CW004, record).matched).toBe(false);
  });

});
