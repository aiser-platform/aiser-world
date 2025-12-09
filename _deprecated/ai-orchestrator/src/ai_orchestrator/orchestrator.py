"""
Enhanced AI Orchestrator - skeleton implementation (Phase 1)

This module provides a minimal, testable skeleton for the EnhancedAIOrchestrator
and embedded lightweight agent placeholders (Planner, Retriever, Executor).

Design notes:
- Hybrid approach: Planner/ Retriever may later use a LangChain-style planner/retriever.
  For Phase 1 we provide small, deterministic placeholders and clear extension points.
- Executor is a custom component that will call platform-specific tools (DB, Cube, ECharts).
- All external integrations are abstracted behind interfaces so they can be mocked in tests.
- Metrics and logging hooks are exposed as simple callables to let the platform hook Prometheus/OpenTelemetry later.

File layout suggestion (future):
- packages/ai-orchestrator/
  - src/ai_orchestrator/orchestrator.py  # (this file)
  - src/ai_orchestrator/agents/planner.py
  - src/ai_orchestrator/agents/retriever.py
  - src/ai_orchestrator/agents/executor.py
  - tests/test_orchestrator.py

Usage (example):
  orchestrator = EnhancedAIOrchestrator(metric_emitter=emit_metric_stub)
  resp = orchestrator.route_request(RequestMeta(...))
"""

from __future__ import annotations
import time
import logging
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Callable
import os

# Optional LangChain adapter (lazy import handled below)
try:
    from ai_orchestrator.adapters.langchain_adapter import LangChainPlanner, LangChainRetriever  # type: ignore
    LANGCHAIN_ADAPTER_AVAILABLE = True
except Exception:
    LANGCHAIN_ADAPTER_AVAILABLE = False

# Optional LiteLLM adapter (lazy import). If present we can construct a LiteLLM-backed
# LangChain-compatible LLM wrapper and pass it into the LangChainPlanner.
try:
    from ai_orchestrator.adapters.litellm_adapter import LiteLLMClientAdapter, LiteLLMLangChainWrapper  # type: ignore
    LITE_LLM_ADAPTER_AVAILABLE = True
except Exception:
    LiteLLMClientAdapter = None  # type: ignore
    LiteLLMLangChainWrapper = None  # type: ignore
    LITE_LLM_ADAPTER_AVAILABLE = False

# Simple logger for the skeleton
logger = logging.getLogger("ai_orchestrator")
logger.setLevel(logging.DEBUG)


@dataclass
class RequestMeta:
    request_id: str
    user_id: str
    organization_id: str
    conversation_id: Optional[str]
    prompt: str
    metadata: Dict[str, Any]


@dataclass
class OrchestratorResponse:
    request_id: str
    status: str  # "ok" | "error"
    result: Any
    confidence: float
    used_services: List[str]
    latency_seconds: float
    trace: Dict[str, Any]


class PlannerInterface:
    """Planner interface / contract.
    A real implementation can use LangChain (or similar) to decompose complex prompts
    into smaller tasks. Here we provide a tiny deterministic placeholder for testing.
    """

    def plan(self, request: RequestMeta) -> List[Dict[str, Any]]:
        """
        Return a list of task dicts. Each task is a simple dict with:
        - id
        - type
        - payload
        """
        raise NotImplementedError


class RetrieverInterface:
    """Retriever interface / contract for fetching context (conversation, project, datasource)."""

    def retrieve(self, request: RequestMeta) -> Dict[str, Any]:
        raise NotImplementedError


class ExecutorInterface:
    """Executor interface for running a single task and returning result."""

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


# Lightweight placeholder implementations (replaceable/mocked in tests)


class SimplePlanner(PlannerInterface):
    def plan(self, request: RequestMeta) -> List[Dict[str, Any]]:
        # Very small heuristic: if prompt contains "sql" or "query" -> NL2SQL task,
        # otherwise a single LLM task.
        text = (request.prompt or "").lower()
        if "sql" in text or "query" in text or "select" in text:
            return [
                {"id": f"{request.request_id}-t1", "type": "nl2sql", "payload": {"prompt": request.prompt}}
            ]
        # default: single llm analysis task
        return [
            {"id": f"{request.request_id}-t1", "type": "llm_analysis", "payload": {"prompt": request.prompt}}
        ]


class SimpleRetriever(RetrieverInterface):
    def retrieve(self, request: RequestMeta) -> Dict[str, Any]:
        # Placeholder: fetch conversation snippets / user role / project settings
        # In real system, query Postgres / conversations table and apply RBAC.
        return {
            "conversation_snippet": "previous messages ...",
            "user_role": request.metadata.get("user_role", "user"),
            "project_context": {"id": request.metadata.get("project_id")},
        }


class SimpleExecutor(ExecutorInterface):
    def __init__(self, llm_caller: Optional[Callable[[str], Dict[str, Any]]] = None):
        # llm_caller should be a callable that takes a prompt and returns {"text": ..., "confidence": ...}
        self.llm_caller = llm_caller or self._default_llm_stub

    def _default_llm_stub(self, prompt: str) -> Dict[str, Any]:
        # Deterministic stub used for tests
        return {"text": f"stubbed-response for: {prompt}", "confidence": 0.85}

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        ttype = task.get("type")
        payload = task.get("payload", {})
        if ttype == "nl2sql":
            # Placeholder: convert natural language to SQL (simple echo)
            prompt = payload.get("prompt", "")
            sql = f"-- SQL (generated): SELECT * FROM table WHERE q = '{prompt[:120].replace('\'','')}'"
            return {"status": "ok", "output": {"sql": sql}, "confidence": 0.8, "used_services": ["nl2sql-stub"]}
        elif ttype == "llm_analysis":
            prompt = payload.get("prompt", "")
            out = self.llm_caller(prompt)
            return {"status": "ok", "output": {"text": out["text"]}, "confidence": out.get("confidence", 0.8), "used_services": ["llm-stub"]}
        else:
            return {"status": "error", "output": f"unknown task type: {ttype}", "confidence": 0.0, "used_services": []}


class EnhancedAIOrchestrator:
    """
    Minimal orchestrator:
    - Uses injected Planner, Retriever, Executor
    - Emits simple metrics via metric_emitter callable (metric_name, value, labels)
    - Returns OrchestratorResponse with trace information
    """

    def __init__(
        self,
        planner: PlannerInterface | None = None,
        retriever: RetrieverInterface | None = None,
        executor: ExecutorInterface | None = None,
        metric_emitter: Optional[Callable[[str, float, Dict[str, str]], None]] = None,
        logger_callable: Optional[Callable[[str], None]] = None,
    ):
        use_lc = os.environ.get("AI_ORCHESTRATOR_USE_LANGCHAIN", "false").lower() == "true"
        use_litellm = os.environ.get("AI_ORCHESTRATOR_USE_LITELLM", "false").lower() == "true"

        # Planner selection: explicit planner param > LangChain (if enabled) > SimplePlanner
        if planner is not None:
            self.planner = planner
        elif use_lc and LANGCHAIN_ADAPTER_AVAILABLE:
            try:
                # Prefer a LiteLLM-backed llm if requested and adapter is available
                if use_litellm and LITE_LLM_ADAPTER_AVAILABLE:
                    # Build lite client from env configuration (fallbacks provided)
                    model = os.environ.get("LITELL_MODEL", os.environ.get("AI_MODEL", "gpt-5-mini"))
                    url = os.environ.get("LITELL_URL", None)
                    client = LiteLLMClientAdapter(model=model, url=url)  # type: ignore
                    lc_wrapper = LiteLLMLangChainWrapper(client)  # type: ignore
                    self.planner = LangChainPlanner(llm=lc_wrapper)  # type: ignore
                else:
                    # Note: integrator may supply a proper llm or configure planner later
                    self.planner = LangChainPlanner(llm=None)  # type: ignore
            except Exception:
                self.planner = SimplePlanner()
        else:
            self.planner = SimplePlanner()

        # Retriever selection
        if retriever is not None:
            self.retriever = retriever
        elif use_lc and LANGCHAIN_ADAPTER_AVAILABLE:
            try:
                self.retriever = LangChainRetriever()
            except Exception:
                self.retriever = SimpleRetriever()
        else:
            self.retriever = SimpleRetriever()

        self.executor = executor or SimpleExecutor()
        self.metric_emitter = metric_emitter or (lambda name, value, labels: None)
        self.logger_callable = logger_callable or (lambda msg: logger.debug(msg))

    def _emit_metric(self, name: str, value: float = 1.0, labels: Dict[str, str] | None = None):
        try:
            self.metric_emitter(name, value, labels or {})
        except Exception as e:
            # metric emission must not break orchestration
            logger.debug("metric emission failed: %s", e)

    def route_request(self, request: RequestMeta, timeout_seconds: float = 30.0) -> OrchestratorResponse:
        start = time.time()
        trace: Dict[str, Any] = {"steps": []}
        used_services: List[str] = []

        # Emit received metric
        self._emit_metric("ai_orchestrator_requests_total", 1.0, {"status": "received"})

        # 1) Retrieve context
        ctx = self.retriever.retrieve(request)
        trace["steps"].append({"step": "retrieve", "result": "ok"})
        self._emit_metric("ai_orchestrator_retriever_calls_total", 1.0, {})

        # 2) Plan tasks
        tasks = self.planner.plan(request)
        trace["steps"].append({"step": "plan", "task_count": len(tasks)})
        self._emit_metric("ai_orchestrator_planner_calls_total", 1.0, {"tasks": str(len(tasks))})

        # 3) Execute tasks sequentially (for the skeleton)
        results = []
        for t in tasks:
            tstart = time.time()
            res = self.executor.execute(t, ctx)
            used_services.extend(res.get("used_services", []))
            results.append({"task_id": t.get("id"), "type": t.get("type"), "res": res})
            self._emit_metric("ai_orchestrator_task_duration_seconds", time.time() - tstart, {"task_type": t.get("type", "")})
            if res.get("status") != "ok":
                # simple fallback: stop and return error
                trace["steps"].append({"step": "execute", "task_id": t.get("id"), "status": "error"})
                latency = time.time() - start
                self._emit_metric("ai_orchestrator_failures_total", 1.0, {"phase": "execute"})
                return OrchestratorResponse(
                    request_id=request.request_id,
                    status="error",
                    result={"error": f"task {t.get('id')} failed", "details": res},
                    confidence=0.0,
                    used_services=list(set(used_services)),
                    latency_seconds=latency,
                    trace=trace,
                )
            trace["steps"].append({"step": "execute", "task_id": t.get("id"), "status": "ok"})
        # 4) Aggregate results (simple aggregator)
        aggregated = {"results": results}
        latency = time.time() - start
        self._emit_metric("ai_orchestrator_success_total", 1.0, {})
        response = OrchestratorResponse(
            request_id=request.request_id,
            status="ok",
            result=aggregated,
            confidence=float(sum((r["res"].get("confidence", 0.0) for r in results)) / max(1, len(results))),
            used_services=list(set(used_services)),
            latency_seconds=latency,
            trace=trace,
        )
        # Logging hook
        try:
            self.logger_callable(f"orchestrator completed: {request.request_id} latency={latency:.3f}s services={response.used_services}")
        except Exception:
            pass
        return response


# Small convenience factory to create a testable orchestrator instance
def make_test_orchestrator():
    return EnhancedAIOrchestrator(metric_emitter=lambda n, v, l: logger.debug("metric %s %s %s", n, v, l))
