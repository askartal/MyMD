# Design rules

MyMD uses the Soft Order look: calm, soft and precise, with a frosted glass window. Design values live in `src/styles/tokens.css`, so use the tokens rather than new values.

## Principles

- **Reading comes first.** The document is the app, and everything else stays quiet.
- **Space does the work.** Group with spacing before reaching for lines.
- **Panels, not boxes.** Edges come from contrast, not heavy borders or shadows.
- **One warm exception.** Red marks where you are, and nothing else.

## Window

- The whole window uses the Windows Acrylic backdrop with the `--glass` tint.
- With transparency effects off, the background is solid `--canvas`.
- The reading panel is always solid `--surface`, with radius `--r-xl`, hairline `--border` and `--e-2` elevation.
- The title bar stays native.

## Sidebar

- It's 248 px wide, with no panel of its own, in both light and dark.
- Top-level Labels and H1 outline rows use full-strength `--text`, while H2 and H3 outline rows use `--text-2` until hovered or active.
- The selected row uses `--sel` and medium weight, and the segmented control's track uses `--track`.
- Below 768 px it becomes a drawer on solid `--surface`.

## Color

- Red is one 8 px `--accent` dot, at most once in a view, on the current file or heading.
- Find highlights use periwinkle.
- Syntax highlighting uses the tag inks and `--text-2`, and it never uses red.
- `--accent` is for fills. Red text, if ever needed, uses `--accent-ink`.

## Type

| Use | Style |
| --- | --- |
| Interface | Inter, `--fs-sm` to `--fs-md` |
| Document body | Inter, `--fs-read`, line height `--lh-read` |
| H1 | `--fs-display`, weight 700 |
| H2 | `--fs-xl`, weight 700 |
| H3 | `--fs-lg`, weight 600 |
| H4 to H6 | `--fs-md`, weight 600 |
| Code | `--font-mono` |
| Times and counts | Tabular numbers |

Headings are never italic, and labels are never all caps.

## Interaction

- Every interactive element has hover, active and `--focus` states, plus disabled where it applies.
- State is never shown by color alone.
- Everything works by keyboard.
- Motion uses transform and opacity only, with `--t-fast`, `--t` and `--ease`. There's no bounce.
- Reduced motion removes movement.

## Writing

- Use sentence case, and leave periods off labels.
- Errors say what happened and what to do, with no raw exception text.
- Empty states invite the next step rather than apologize.
- Never invent figures or testimonials.

## Don't

- Don't add a second red element.
- Don't use heavy borders, dark shadows or gradient buttons.
- Don't hard-code colors, fonts or spacing outside the tokens.
- Don't draw fake window chrome. Use real screenshots.
