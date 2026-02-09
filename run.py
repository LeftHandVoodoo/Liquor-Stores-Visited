#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def split_forward_args(argv: list[str]) -> tuple[list[str], list[str]]:
    if "--" not in argv:
        return argv, []
    idx = argv.index("--")
    return argv[:idx], argv[idx + 1 :]


def resolve_npm() -> str:
    if not Path("package.json").exists():
        print("Error: package.json not found. Run this from the repo root.", file=sys.stderr)
        sys.exit(1)

    npm_path = shutil.which("npm")
    if npm_path is None:
        print("Error: npm not found on PATH. Install Node.js and npm first.", file=sys.stderr)
        sys.exit(1)

    if not Path("node_modules").exists():
        print("Warning: node_modules not found. Run `npm install` first.", file=sys.stderr)

    return npm_path


def run_cmd(cmd: list[str], npm_path: str) -> int:
    if cmd and cmd[0] == "npm":
        cmd = [npm_path] + cmd[1:]
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    return result.returncode


def main(argv: list[str]) -> int:
    parsed_args, forward_args = split_forward_args(argv)

    parser = argparse.ArgumentParser(
        description="Start the Liquor Stores app.",
        add_help=True,
    )
    parser.add_argument(
        "--prod",
        action="store_true",
        help="Run production build then preview server.",
    )
    args = parser.parse_args(parsed_args)

    npm_path = resolve_npm()

    # Ensure server dependencies are installed
    server_dir = Path("server")
    if server_dir.exists() and not (server_dir / "node_modules").exists():
        print("Installing server dependencies...")
        import os
        original_cwd = os.getcwd()
        try:
            os.chdir("server")
            install_rc = run_cmd(["npm", "install"], npm_path)
            if install_rc != 0:
                print("Warning: Failed to install server dependencies", file=sys.stderr)
        finally:
            os.chdir(original_cwd)

    if args.prod:
        # Build frontend
        build_cmd = ["npm", "run", "build"]
        build_rc = run_cmd(build_cmd, npm_path)
        if build_rc != 0:
            return build_rc

        # Start server in background
        import subprocess
        server_process = subprocess.Popen(
            [npm_path, "run", "start:server"],
            cwd=Path.cwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Give server time to start
        import time
        time.sleep(2)

        preview_cmd = ["npm", "run", "preview"]
        if forward_args:
            preview_cmd += ["--"] + forward_args
        try:
            return run_cmd(preview_cmd, npm_path)
        finally:
            # Cleanup: terminate server when preview exits
            if server_process.poll() is None:
                server_process.terminate()

    # Development mode - start server and frontend together
    dev_full_cmd = ["npm", "run", "dev:full"]
    if forward_args:
        dev_full_cmd += ["--"] + forward_args
    return run_cmd(dev_full_cmd, npm_path)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
