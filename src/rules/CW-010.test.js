import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW010 from './CW-010.js';

const CLOUD_APP_ADMIN_ID = '158c047a-c907-4556-b7ef-446551a6b5f7';
const APP_ADMIN_ID       = '9b895d92-2cd3-44c7-9d02-a6ac2d5ea5c3';

describe('CW-010 fixtures', () => {

  it('positive 1: user holds Cloud Application Administrator at scope /, plane entra -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000037', displayName: 'Rosa Example', type: 'user', upn: 'rosa@example.com' },
      assignments: [{ roleDefinitionId: CLOUD_APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    const result = evaluateRule(CW010, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('positive 2: servicePrincipal holds Cloud Application Administrator -> matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000038', displayName: 'cloud-app-mgmt-sp', type: 'servicePrincipal', appId: '00000000-0000-0000-0000-000000000089' },
      assignments: [{ roleDefinitionId: CLOUD_APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW010, record).matched).toBe(true);
  });

  it('negative 1: user holds Application Administrator (wrong GUID) -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000039', displayName: 'Sam Example', type: 'user', upn: 'sam@example.com' },
      assignments: [{ roleDefinitionId: APP_ADMIN_ID, scope: '/', plane: 'entra' }],
    };
    expect(evaluateRule(CW010, record).matched).toBe(false);
  });

  it('negative 2: user holds correct GUID but plane azure -> not matched', () => {
    const record = {
      principal: { id: '00000000-0000-0000-0000-000000000040', displayName: 'Tina Example', type: 'user', upn: 'tina@example.com' },
      assignments: [{ roleDefinitionId: CLOUD_APP_ADMIN_ID, scope: '/', plane: 'azure' }],
    };
    expect(evaluateRule(CW010, record).matched).toBe(false);
  });

});
