// Rule engine — faithful JS port of internal/engine/evaluator.go +
// internal/engine/scope.go + internal/engine/scope_pattern.go from the Go CLI.
//
// Public API:
//   evaluateRule(rule, record)          -> { matched, scope }
//   evaluateAllRules(rules, records)    -> [{ rule, principal, scope }, ...]
//
// record: { principal, assignments[], tenantId? }
//   principal:   { type, isAiAgent?, isMicrosoftFirstParty?, isExternalGuest?, ... }
//   assignments: [{ roleDefinitionId, scope, plane? }, ...]

// ============================================================
// Scope helpers — port of scope.go
// ============================================================

const MG_PREFIX = '/providers/Microsoft.Management/managementGroups/';

// scopeIsAncestorOf: port of Scope.IsAncestorOf
function scopeIsAncestorOf(s, other) {
  if (s === other) return false;
  if (s === '/') return other !== '';
  // v0.1: management group paths are opaque — not ancestors of any other scope
  if (s.startsWith(MG_PREFIX)) return false;
  return other.startsWith(s + '/');
}

// scopeCovers: port of Scope.Covers
function scopeCovers(s, other) {
  return s === other || scopeIsAncestorOf(s, other);
}

// ============================================================
// Pattern matching — port of scope_pattern.go MatchesPattern
// ============================================================

// matchesPattern returns true when the assignment's literal scope satisfies
// the pattern. An empty pattern is unconstrained (always true).
function matchesPattern(scope, pattern, tenantId) {
  if (!pattern) return true;

  if (pattern === 'root') {
    if (scope === '/') return true;
    if (tenantId) return scope === `${MG_PREFIX}${tenantId}`;
    return false;
  }

  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return scope === prefix || scope.startsWith(prefix + '/');
  }

  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    if (!scope.startsWith(prefix + '/')) return false;
    const rest = scope.slice(prefix.length + 1);
    return rest.length > 0 && !rest.includes('/');
  }

  return scope === pattern;
}

// ============================================================
// Principal filter — port of principalAllowed
// ============================================================

function principalAllowed(filter, principal) {
  if (filter.types && filter.types.length > 0) {
    if (!filter.types.includes(principal.type)) return false;
  }
  const props = filter.properties;
  if (props) {
    if (props.isAiAgent != null && props.isAiAgent !== !!principal.isAiAgent) return false;
    if (props.isMicrosoftFirstParty != null && props.isMicrosoftFirstParty !== !!principal.isMicrosoftFirstParty) return false;
    if (props.isExternalGuest != null && props.isExternalGuest !== !!principal.isExternalGuest) return false;
  }
  return true;
}

// ============================================================
// Plane helpers — port of effectivePlane / planesMatch
// ============================================================

function effectivePlane(declared, rulePlane) {
  return declared || rulePlane;
}

function planesMatch(rule, req, asn) {
  return effectivePlane(req.plane, rule.plane) === effectivePlane(asn.plane, rule.plane);
}

// ============================================================
// Candidate index — collect qualifying assignment indices per requirement
// ============================================================

function buildCandidates(rule, record) {
  return rule.requires.map((req) => {
    const indices = [];
    record.assignments.forEach((asn, j) => {
      if (asn.roleDefinitionId !== req.roleDefinitionId) return;
      if (!planesMatch(rule, req, asn)) return;
      if (req.scopePattern && !matchesPattern(asn.scope, req.scopePattern, record.tenantId || '')) return;
      indices.push(j);
    });
    return indices;
  });
}

// ============================================================
// Backtracking satisfaction — port of satisfy()
// ============================================================
//
// Recursively tries to commit one candidate assignment per requirement.
// Requirements sharing the same scopeBinding label must resolve to a
// consistent scope: when one scope covers the other, the more specific
// wins; when neither covers the other, this branch is abandoned.

function satisfy(reqs, assignments, candidates, idx, used, scopeClaims) {
  if (idx === reqs.length) return true;

  const req = reqs[idx];
  for (const ai of candidates[idx]) {
    if (used[ai]) continue;

    const candidateScope = assignments[ai].scope;
    const existingClaim = scopeClaims[req.scopeBinding];
    const hasClaim = existingClaim !== undefined;

    let newClaim;
    let claimChanged = false;

    if (!hasClaim) {
      newClaim = candidateScope;
      claimChanged = true;
    } else if (scopeCovers(existingClaim, candidateScope)) {
      // existingClaim is ancestor-or-equal of candidateScope; narrow to more specific
      newClaim = candidateScope;
      claimChanged = existingClaim !== candidateScope;
    } else if (scopeCovers(candidateScope, existingClaim)) {
      // candidateScope is ancestor-or-equal of existingClaim; keep the more specific
      newClaim = existingClaim;
      // claimChanged stays false — scopeClaims is not mutated
    } else {
      // Incompatible scopes — no consistent binding possible with this candidate
      continue;
    }

    // Commit
    used[ai] = true;
    if (!hasClaim || claimChanged) {
      scopeClaims[req.scopeBinding] = newClaim;
    }

    if (satisfy(reqs, assignments, candidates, idx + 1, used, scopeClaims)) {
      return true;
    }

    // Backtrack: restore state to before this commit
    used[ai] = false;
    if (!hasClaim) {
      delete scopeClaims[req.scopeBinding];
    } else if (claimChanged) {
      scopeClaims[req.scopeBinding] = existingClaim;
    }
  }

  return false;
}

// ============================================================
// Public API
// ============================================================

// evaluateRule: port of MatchEvaluator.Evaluate
// record: { principal, assignments[], tenantId? }
// Returns { matched: bool, scope: string }
export function evaluateRule(rule, record) {
  if (!rule.requires || rule.requires.length === 0) {
    throw new Error(`Rule ${rule.id} has no requirements`);
  }

  if (!principalAllowed(rule.principalFilter, record.principal)) {
    return { matched: false, scope: '' };
  }

  const candidates = buildCandidates(rule, record);
  const used = new Array(record.assignments.length).fill(false);
  const scopeClaims = {};

  if (!satisfy(rule.requires, record.assignments, candidates, 0, used, scopeClaims)) {
    return { matched: false, scope: '' };
  }

  return { matched: true, scope: scopeClaims[rule.requires[0].scopeBinding] || '' };
}

// evaluateAllRules runs every rule against every record and returns all matches.
// findings: [{ rule, principal, scope }, ...]
export function evaluateAllRules(rules, records) {
  const findings = [];
  for (const rule of rules) {
    for (const record of records) {
      const result = evaluateRule(rule, record);
      if (result.matched) {
        findings.push({ rule, principal: record.principal, scope: result.scope });
      }
    }
  }
  return findings;
}
