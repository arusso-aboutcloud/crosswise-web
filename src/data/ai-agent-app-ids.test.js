// Integrity tests for the AI-agent app-ID allowlist.
//
// These tests run in CI (npm run test) and act as the quality gate for PRs
// that add new entries to src/data/ai-agent-app-ids.js. A malformed,
// unsourced, or duplicate entry will fail the build before it merges.

import { describe, it, expect } from 'vitest';
import { AI_AGENT_APPS, AI_AGENT_APP_ID_SET } from './ai-agent-app-ids.js';

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('AI_AGENT_APPS data integrity', () => {

  it('has at least one entry', () => {
    expect(AI_AGENT_APPS.length).toBeGreaterThan(0);
  });

  it('every entry has non-empty appId, name, and source', () => {
    for (const entry of AI_AGENT_APPS) {
      expect(typeof entry.appId,  `appId missing on: ${JSON.stringify(entry)}`).toBe('string');
      expect(typeof entry.name,   `name missing on: ${JSON.stringify(entry)}`).toBe('string');
      expect(typeof entry.source, `source missing on: ${JSON.stringify(entry)}`).toBe('string');
      expect(entry.appId.trim().length,  `appId empty on: ${entry.name}`).toBeGreaterThan(0);
      expect(entry.name.trim().length,   `name empty`).toBeGreaterThan(0);
      expect(entry.source.trim().length, `source empty on: ${entry.name} -- every entry must cite a verifiable reference`).toBeGreaterThan(0);
    }
  });

  it('every appId is a well-formed lowercase GUID', () => {
    for (const entry of AI_AGENT_APPS) {
      expect(GUID_RE.test(entry.appId),
        `appId "${entry.appId}" on "${entry.name}" is not a valid GUID`
      ).toBe(true);
    }
  });

  it('no duplicate appIds', () => {
    const seen = new Set();
    for (const entry of AI_AGENT_APPS) {
      expect(seen.has(entry.appId),
        `duplicate appId "${entry.appId}" in AI_AGENT_APPS`
      ).toBe(false);
      seen.add(entry.appId);
    }
  });

  it('AI_AGENT_APP_ID_SET size matches AI_AGENT_APPS length', () => {
    expect(AI_AGENT_APP_ID_SET.size).toBe(AI_AGENT_APPS.length);
  });

  it('AI_AGENT_APP_ID_SET contains every appId from AI_AGENT_APPS', () => {
    for (const entry of AI_AGENT_APPS) {
      expect(AI_AGENT_APP_ID_SET.has(entry.appId),
        `${entry.appId} missing from AI_AGENT_APP_ID_SET`
      ).toBe(true);
    }
  });

});
