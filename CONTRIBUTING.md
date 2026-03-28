# Contributing to Trusted Games Platform

Thanks for taking the time to contribute!

## Ways to Contribute

- **Bug reports** — use the [Bug Report template](https://github.com/Charles-beta-he/trusted-games-platform/issues/new?template=bug_report.md)
- **Feature requests** — use the [Feature Request template](https://github.com/Charles-beta-he/trusted-games-platform/issues/new?template=feature_request.md)
- **New games** — see [Adding a New Game](./README.md#adding-a-new-game) in the README
- **UI / UX improvements** — label your PR with `ui`
- **Translations** — Chinese ↔ English copy lives inline in JSX

## Development Setup

```bash
git clone https://github.com/Charles-beta-he/trusted-games-platform.git
cd trusted-games-platform
pnpm install
pnpm dev
```

## Pull Request Guidelines

- **One concern per PR** — a bug fix and a refactor should be separate PRs
- **No unrelated changes** — don't clean up code outside the area you're touching
- **Test on mobile** — if you touch layout, verify on a 390px viewport
- **Describe the why** — PR description should explain motivation, not just what changed
- Fill in the [PR template](./.github/PULL_REQUEST_TEMPLATE.md)

## Code Style

- React functional components only
- Inline styles for dynamic/theme-aware values; Tailwind utility classes for layout
- No TypeScript (project uses plain JS + JSDoc where helpful)
- No default exports from `lib/` — named exports only

## Commit Messages

```
type: short description (≤72 chars)

Optional longer body explaining why.
```

Types: `feat` / `fix` / `chore` / `docs` / `style` / `refactor` / `test`

## Security

If you find a security vulnerability, **do not open a public issue**.
Email the maintainer directly or use GitHub's private security advisory feature.
