# Contributing to Liquor Stores

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development Workflow

1. Make changes
2. Run tests: `npm test`
3. Run linter: `npm run lint`
4. Commit with conventional commit message
5. Push and create PR

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, no code change
- `refactor:` Code change, no feature/fix
- `test:` Adding tests
- `chore:` Maintenance

## Code Review

All PRs require review before merging.

## Documentation

When making changes:
- Update `docs/architecture.md` for structural changes
- Update `docs/api.md` for API changes
- Create an ADR in `docs/adr/` for significant decisions
