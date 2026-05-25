# Contributing to BizZW

Thanks for helping improve BizZW.

## Workflow

1. Fork the repository or create a feature branch.
2. Make your changes in a focused commit.
3. Run the relevant checks locally.
4. Open a pull request against `main`.

## Recommended checks

### Backend

```bash
cd backend
npm ci
npm run lint
npm run type-check
npm run test
npm run build
```

### Frontend

```bash
cd frontend
npm ci
npm run lint
npm run type-check
npm run test
npm run build
```

## Guidelines

- Keep changes small and focused.
- Add or update tests when behavior changes.
- Avoid unrelated refactors in the same pull request.
- Document new environment variables or setup steps in the README.

## Pull requests

- Describe what changed and why.
- Include screenshots for UI changes when helpful.
- Mention any setup or migration steps reviewers should know about.
