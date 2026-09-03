// ============================================================================
// POSSESSIVE — canonical English possessive formatting for a display name.
//
// Every mid-sentence "[Name]'s ..." construction in the app (Journal
// subtitle, Insights subtitle, onboarding copy, share/invite text, etc.)
// built its own inline `${name}'s` template — always appending 's
// regardless of the name's last letter. That's wrong for any name already
// ending in s: "James's" should read "James'" per standard English
// possessive rules. Single-letter names (e.g. "F") are unaffected by that
// rule (F does not end in s) and correctly still get 's.
//
// Rule: name ends in s/S -> append just an apostrophe ("James'").
//       otherwise         -> append 's ("Frank's", "F's").
// ============================================================================

export function possessive(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return trimmed;
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}
