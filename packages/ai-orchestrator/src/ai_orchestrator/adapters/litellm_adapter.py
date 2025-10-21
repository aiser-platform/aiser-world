"""
LiteLLM adapter to integrate LiteLLM models with the LangChain-enabled planner/retriever.

This adapter provides two conveniences:
- LiteLLMClientAdapter: a thin wrapper around a LiteLLM client (if the litellm package is available)
  or a configurable HTTP endpoint. It exposes a simple `call(prompt, **kwargs)` method that returns text and
  confidence-like metadata.
- LiteLLMLangChainWrapper: a minimal compatibility wrapper that implements the small subset of the
  LangChain LLM interface that our LangChainPlanner (LLMChain) may call. It implements:
    - generate(prompts: List[str], **kwargs)
    - __call__(prompt: str, **kwargs)
    - predict(prompt: str, **kwargs)
  The generate() method returns a lightweight object with `.generations` shaped similarly to what
  LangChain expects (list of lists of objects with `text` attribute). This is intentionally small
  and pragmatic so the adapter is robust across LangChain versions.

Notes:
- This module uses lazy imports and will raise a clear error if litellm is not installed.
- The actual LiteLLM client usage depends on the environment (local litellm python package, HTTP server, etc.)
  Adjust LiteLLMClientAdapter._call_litellm accordingly if you run a different runtime.
- The wrapper is deliberately forgiving: if the exact LangChain LLM contract in your environment differs,
  you can adapt `LiteLLMLangChainWrapper.generate` to produce the expected object shape.

Usage example:
    from ai_orchestrator.adapters.litellm_adapter import LiteLLMClientAdapter, LiteLLMLangChainWrapper
    client = LiteLLMClientAdapter(model="gpt-5-mini", url="http://localhost:8080")
    lc_llm = LiteLLMLangChainWrapper(client)
    # pass lc_llm into LangChain LLMChain or into LangChainPlanner(llm=lc_llm)
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional

try:
    import litellm  # type: ignore
except Exception as _e:  # pragma: no cover - import guard
    litellm = None  # type: ignore

import json
import logging
logger = logging.getLogger("litellm_adapter")


class LiteLLMNotAvailableError(ImportError):
    pass


class LiteLLMClientAdapter:
    """
    Thin adapter around LiteLLM. It supports two modes:
    - If the `litellm` python package is available and provides a client, use it.
    - Otherwise, if `url` is provided, POST to an HTTP endpoint that implements a simple
      LiteLLM inference API: { "model": ..., "prompt": "..." } and returns JSON { "text": "...", "confidence": 0.9 }.

    Constructor args:
      model: model name string e.g. "gpt-5-mini"
      url: optional inference HTTP endpoint (fallback)
      client_config: optional dict passed to litellm client factory if available
    """

    def __init__(self, model: str = "gpt-5-mini", url: Optional[str] = None, client_config: Optional[Dict[str, Any]] = None):
        self.model = model
        self.url = url
        self.client_config = client_config or {}
        self._client = None
        if litellm is not None:
            try:
                # Example: litellm.Client(...) - adapt if your litellm API differs
                self._client = getattr(litellm, "Client", None)
                if callable(self._client):
                    self._client = self._client(model=model, **self.client_config)
                else:
                    # some litellm versions expose a different API - keep _client None to fall back to HTTP
                    self._client = None
            except Exception as e:
                logger.debug("litellm python client initialization failed: %s", e)
                self._client = None

    def call(self, prompt: str, max_tokens: int = 512, temperature: float = 0.0, **kwargs) -> Dict[str, Any]:
        """
        Call the underlying LiteLLM model and return {"text": str, "confidence": float, "raw": <provider response>}
        """
        if self._client is not None:
            try:
                # This is a best-effort call; adapt to your litellm client signature.
                resp = self._client.generate(prompt, max_tokens=max_tokens, temperature=temperature, **kwargs)
                # Normalize response
                text = None
                confidence = None
                if isinstance(resp, dict):
                    text = resp.get("text") or resp.get("output") or resp.get("response")
                else:
                    # try attribute access
                    text = getattr(resp, "text", None) or str(resp)
                return {"text": text, "confidence": confidence or 0.9, "raw": resp}
            except Exception as e:
                logger.debug("litellm client call error: %s", e)
                raise
        elif self.url:
            # HTTP fallback - simple POST
            try:
                import requests
                payload = {"model": self.model, "prompt": prompt, "max_tokens": max_tokens, "temperature": temperature}
                r = requests.post(self.url, json=payload, timeout=30.0)
                r.raise_for_status()
                data = r.json()
                return {"text": data.get("text") or data.get("output") or "", "confidence": data.get("confidence", 0.9), "raw": data}
            except Exception as e:
                logger.debug("LiteLLM HTTP call failed: %s", e)
                raise
        else:
            raise LiteLLMNotAvailableError("No litellm client or endpoint configured. Install litellm or provide url.")


# Minimal LangChain-compatible wrapper
class LiteLLMLangChainWrapper:
    """
    Minimal wrapper providing the generate(...) and __call__ interfaces expected by LangChain's LLMChain.

    Methods:
      - generate(prompts: List[str], **kwargs) -> object with `.generations`
      - __call__(prompt: str, **kwargs) -> str
      - predict(prompt: str, **kwargs) -> str

    The generate() return value is a simple object:
      class _G:
          generations = [[SimpleGen(text)]]
    where SimpleGen has attribute `text`.
    """

    class SimpleGen:
        def __init__(self, text: str):
            self.text = text

    class _G:
        def __init__(self, gens: List[List["LiteLLMLangChainWrapper.SimpleGen"]]):
            self.generations = gens

    def __init__(self, client: LiteLLMClientAdapter):
        if client is None:
            raise LiteLLMNotAvailableError("Provide a LiteLLMClientAdapter instance")
        self.client = client

    def generate(self, prompts: List[str], **kwargs) -> Any:
        # LangChain may call generate with a list of prompts; we'll call the client for the first prompt for now
        results = []
        for p in prompts:
            resp = self.client.call(p, **kwargs)
            text = resp.get("text", "")
            results.append([self.SimpleGen(text)])
        return self._G(results)

    def __call__(self, prompt: str, **kwargs) -> str:
        # Provide a simple string return for LLMChain.run / chain usage
        resp = self.client.call(prompt, **kwargs)
        return resp.get("text", "")

    def predict(self, prompt: str, **kwargs) -> str:
        return self.__call__(prompt, **kwargs)

    # Convenience: expose last raw for debug if needed
    def call_raw(self, prompt: str, **kwargs) -> Dict[str, Any]:
        return self.client.call(prompt, **kwargs)
