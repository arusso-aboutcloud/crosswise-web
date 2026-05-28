// Template renderer for rule finding text.
//
// The legacy Go rule YAML uses Go template tokens: {{.principal.display_name}},
// {{.scope.A.id}}, {{.principal.object_id}}. Our normalized principals use
// camelCase JS keys (displayName, id). The renderer bridges this two ways:
//
//   1. The context is built with explicit snake_case aliases alongside camelCase,
//      so {{.principal.display_name}} resolves directly via principal.display_name.
//   2. As a fallback, unresolved snake_case path segments are converted to
//      camelCase (display_name -> displayName) before a second lookup.
//
// Call site builds context as:
//   {
//     principal: { ...normalizedPrincipal, display_name, object_id },
//     scope: { A: { id: matchScope } }
//   }

export function renderTemplate(template, context) {
  return template.replace(/\{\{\s*\.([a-zA-Z0-9_.]+)\s*\}\}/g, (match, path) => {
    const parts = path.split('.');
    let val = context;
    for (const part of parts) {
      if (val == null || typeof val !== 'object') return match;
      if (Object.prototype.hasOwnProperty.call(val, part)) {
        val = val[part];
      } else {
        // Fallback: snake_case -> camelCase (e.g. display_name -> displayName)
        const camel = part.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (Object.prototype.hasOwnProperty.call(val, camel)) {
          val = val[camel];
        } else {
          return match; // unresolved — leave token in place
        }
      }
    }
    return val != null ? String(val) : match;
  });
}

// Build the template context for a finding match.
// principal: normalized principal from collector
// scope: scope string from evaluateRule result
export function buildTemplateContext(principal, scope) {
  return {
    principal: {
      ...principal,
      display_name: principal.displayName,
      object_id: principal.id,
    },
    scope: {
      A: { id: scope },
    },
  };
}
