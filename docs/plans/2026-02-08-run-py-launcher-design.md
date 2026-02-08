# run.py Launcher Design

Date: 2026-02-08
Status: Proposed

## Summary

Create a lightweight `run.py` entrypoint that starts the app for developers who prefer a Python command. By default it runs `npm run dev`. With `--prod`, it runs `npm run build` followed by `npm run preview`. The script performs minimal prerequisite checks and forwards extra CLI args to npm/Vite using `--`.

## Goals

- Provide a single, simple Python entrypoint to start the app.
- Keep behavior explicit, with no hidden installs or side effects.
- Preserve npm/Vite output and exit codes.
- Allow users to pass through Vite flags.

## Non-goals

- Replacing npm scripts or changing the existing JS toolchain.
- Adding new runtime dependencies for Python or Node.
- Automating dependency installation without user consent.

## Architecture and Behavior

`run.py` is a thin orchestrator. It will:

1. Verify `package.json` exists in the current working directory.
2. Verify `npm` is available on PATH.
3. Determine the mode:
   - Default: `npm run dev`
   - `--prod`: `npm run build` then `npm run preview`
4. Forward any args after `--` to the underlying npm command.

For production mode, if the build step fails, the script exits with that failure code and does not attempt `preview`.

## CLI Contract

- `python run.py` runs development mode.
- `python run.py --prod` runs build then preview.
- `python run.py -- --host 0.0.0.0` forwards args to `npm run dev`.
- `python run.py --prod -- --port 4173` forwards args to `npm run preview` after build.

## Error Handling

- Missing `package.json`: exit non-zero with a clear message.
- Missing `npm` on PATH: exit non-zero with a clear message.
- Subprocess failures: exit with the same code and preserve stdout/stderr.
- If `node_modules` is missing, print a warning suggesting `npm install`, but do not auto-install.

## Testing

No new test framework is introduced. This change can be validated manually by running:

- `python run.py`
- `python run.py --prod`
- `python run.py -- --host 0.0.0.0`

If Python tests already exist in the repo, add unit tests for argument parsing and command assembly. Otherwise, keep the change minimal and avoid introducing Python test tooling.

## Documentation

Update `README.md` Usage to mention:

- `python run.py` for dev mode.
- `python run.py --prod` for build + preview.
