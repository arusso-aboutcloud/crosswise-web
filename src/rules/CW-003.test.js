// CW-003 fixture tests — ported verbatim from the inline fixtures in
//   internal/scan/embedded_rules/CW-003-privileged-authentication-administrator.yaml
//
// Four cases: 2 positive (user, servicePrincipal), 2 negative (wrong role GUID,
// wrong plane). All must pass.

import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../engine.js';
import CW003 from './CW-003.js';

const PRIV_AUTH_ADMIN_ID = '7be44c8a-adaf-4e2a-84d6-ab2649e08a13';
const AUTH_ADMIN_ID      = 'c4e39bd9-1100-46d3-8c65-fb160da0071f';

describe('CW-003 fixtures', () => {

  it('positive 1: user holds Privileged Authentication Administrator at scope /, plane entra → matched', () => {
    // Canonical case — the role alone is sufficient for tenant takeover via
    // Global Admin password reset.
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000007',
        displayName: 'Frank Example',
        type: 'user',
        upn: 'frank@example.com',
      },
      assignments: [
        { roleDefinitionId: PRIV_AUTH_ADMIN_ID, scope: '/', plane: 'entra' },
      ],
    };
    const result = evaluateRule(CW003, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('positive 2: servicePrincipal holds Privileged Authentication Administrator → matched', () => {
    // Highest-risk variant — programmatic, unattended access to Global Admin
    // password reset capability.
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000008',
        displayName: 'identity-ops-sp',
        type: 'servicePrincipal',
        appId: '00000000-0000-0000-0000-000000000098',
      },
      assignments: [
        { roleDefinitionId: PRIV_AUTH_ADMIN_ID, scope: '/', plane: 'entra' },
      ],
    };
    const result = evaluateRule(CW003, record);
    expect(result.matched).toBe(true);
    expect(result.scope).toBe('/');
  });

  it('negative 1: user holds Authentication Administrator (wrong GUID) → not matched', () => {
    // Authentication Administrator (c4e39bd9-...) is blocked from managing
    // accounts that hold directory roles; it cannot reset a Global Admin\'s
    // password. Different role_definition_id — must not match.
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000009',
        displayName: 'Grace Example',
        type: 'user',
        upn: 'grace@example.com',
      },
      assignments: [
        { roleDefinitionId: AUTH_ADMIN_ID, scope: '/', plane: 'entra' },
      ],
    };
    const result = evaluateRule(CW003, record);
    expect(result.matched).toBe(false);
  });

  it('negative 2: user holds correct GUID but plane azure (wrong plane) → not matched', () => {
    // The requirement declares plane entra; the plane mismatch prevents matching.
    const record = {
      principal: {
        id: '00000000-0000-0000-0000-000000000010',
        displayName: 'Henry Example',
        type: 'user',
        upn: 'henry@example.com',
      },
      assignments: [
        { roleDefinitionId: PRIV_AUTH_ADMIN_ID, scope: '/', plane: 'azure' },
      ],
    };
    const result = evaluateRule(CW003, record);
    expect(result.matched).toBe(false);
  });

});
