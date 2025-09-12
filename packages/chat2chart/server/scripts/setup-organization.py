#!/usr/bin/env python3
"""
Wrapper copy of project root setup-real-organization.py so backend container can run it from /app/scripts
This file is a thin proxy that imports and runs the real setup script from the repository root.
"""
import os
import sys
import asyncio

# Ensure repo root is on path
# Try multiple possible locations for the real setup script (works for mounted volumes or image layouts)
candidates = [
    os.path.join(os.path.dirname(__file__), '..', '..', '..', 'scripts', 'setup-real-organization.py'),
    os.path.join(os.path.dirname(__file__), '..', '..', 'scripts', 'setup-real-organization.py'),
    os.path.join('/', 'scripts', 'setup-real-organization.py'),
    os.path.join(os.path.dirname(__file__), 'setup-real-organization.py'),
]

real_script_path = None
for p in candidates:
    p_abs = os.path.abspath(p)
    if os.path.exists(p_abs):
        real_script_path = p_abs
        break

if not real_script_path:
    print("ERROR: real setup script not found; looked in:")
    for p in candidates:
        print(" -", os.path.abspath(p))
    raise SystemExit(1)

# Execute the real script in-process so it can reuse project imports
with open(real_script_path, 'r') as f:
    code = compile(f.read(), real_script_path, 'exec')
    exec_globals = {'__name__': '__main__', '__file__': real_script_path}
    exec(code, exec_globals)


