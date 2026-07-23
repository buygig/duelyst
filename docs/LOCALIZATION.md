# Localization layout

Visible player-facing text must live in locale resources rather than UI
templates, JavaScript, or CoffeeScript.

## Where text belongs

- Short UI labels, buttons, validation messages, and dialog copy belong in
  `app/localization/locales/<locale>/<namespace>.json` and are read with
  `localize` or `i18next.t()`.
- Long SDK-owned content belongs beside its feature under
  `app/sdk/<feature>/locales/<locale>/`. English is the canonical fallback;
  other locales must preserve the same identifiers, fields, placeholders,
  markup, and paragraph boundaries.
- Feature code keeps only language-neutral metadata such as IDs, resource
  paths, enabled flags, and unlock conditions. Locale data may only overlay
  explicitly allowed visible-content fields.
- Images containing words need locale-specific assets. They cannot be made
  translatable by adding a JSON key.

Do not combine every feature into one large translation file. “Centralized”
means a consistent locale hierarchy, naming convention, terminology, and
validation contract, while each feature retains a bounded resource file.

## Adding or changing copy

1. Add the English source string to its namespace or feature content file.
2. Add the same key and structure to every supported locale.
3. Reuse the vocabulary already present in cards, rules, and Codex content.
4. Keep visible prose out of `.hbs`, `.js`, and `.coffee` files.
5. Run the localization and feature-specific content tests before packaging.

The Simplified Chinese parity tests verify namespace keys, interpolation,
HTML, critical offline flows, and known hardcoded regressions. Codex and card
lore have additional coverage for IDs, schema, paragraphs, fallback, and
language switching.
