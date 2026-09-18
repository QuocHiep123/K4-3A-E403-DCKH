"""Local JSON-lines traces for investigating LLM requests. Never log headers."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import threading

TRACE_PATH = Path(__file__).resolve().parents[1] / 'logs/llm-requests.log'
LOCK = threading.Lock()


def append(event, api_key=''):
    record = {'timestamp': datetime.now(timezone.utc).isoformat(), **event}
    try:
        line = json.dumps(record, ensure_ascii=False, allow_nan=False)
        # Also scrub the credential if a provider happens to echo it in an error.
        if api_key:
            line = line.replace(api_key, '[REDACTED]')
        with LOCK:
            TRACE_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            fd = os.open(TRACE_PATH, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
            with os.fdopen(fd, 'a', encoding='utf-8') as stream:
                stream.write(line + '\n')
        return True
    except (OSError, ValueError, TypeError):
        print('Could not write local LLM trace; check logs directory permissions/disk space.', file=sys.stderr)
        return False
