"""One wall-clock budget shared by every external tool an analysis runs.

nginx gives the backend 300s (proxy_read_timeout) to answer once an upload has
arrived. A fixed per-call timeout can't honour that: one analysis runs up to a
dozen bcftools/bgzip/tabix/SnpEff processes. Instead analyze_vcf opens a budget
(config.TOOL_BUDGET_SECONDS) and every subprocess.run passes
`timeout=remaining()` -- whatever is left of it. A tool that overruns raises
subprocess.TimeoutExpired (and is killed by subprocess.run), which each stage
maps to its own error, so the client gets the usual incident-id 500 instead of
an nginx 504 while the work carries on unseen.
"""

import time
from contextvars import ContextVar, Token

from ..core import config

_deadline: ContextVar[float | None] = ContextVar("oncotrace_tool_deadline", default=None)


def start() -> Token:
    """Opens the budget for the analysis running in this context; pass the
    returned token to end() when the analysis finishes."""
    return _deadline.set(time.monotonic() + config.TOOL_BUDGET_SECONDS)


def end(token: Token) -> None:
    _deadline.reset(token)


def remaining() -> float:
    """Seconds left for the next tool call. Outside an analysis (tests, one-off
    scripts) each call gets the whole budget to itself."""
    deadline = _deadline.get()
    if deadline is None:
        return config.TOOL_BUDGET_SECONDS
    return max(deadline - time.monotonic(), 0.0)
