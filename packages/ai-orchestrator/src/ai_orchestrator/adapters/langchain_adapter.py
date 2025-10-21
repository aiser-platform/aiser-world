"""
LangChain Adapter for Planner and Retriever

This adapter provides classes that implement the PlannerInterface and RetrieverInterface
defined in ai_orchestrator.orchestrator and delegate to LangChain components.

Behavior:
- If LangChain is not installed, using these classes will raise ImportError with a helpful message.
- This file is safe to add without installing dependencies; it isolates imports and provides clear error guidance.

Usage:
    from ai_orchestrator.adapters.langchain_adapter import LangChainPlanner, LangChainRetriever
    planner = LangChainPlanner(llm_provider=your_llm)
    tasks = planner.plan(request_meta)
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional

# Local import of interfaces (relative import)
from ai_orchestrator.orchestrator import PlannerInterface, RetrieverInterface, RequestMeta

try:
    # Import lazily to avoid hard dependency at repository checkout time.
    from langchain import LLMChain, PromptTemplate
    from langchain.agents import initialize_agent, Tool, AgentExecutor
    from langchain.chains import RetrievalQA
    from langchain.vectorstores.base import VectorStore
    from langchain.schema import BaseRetriever
except Exception as e:  # pragma: no cover - import guard
    LANGLE_CHAIN_IMPORT_ERROR = e
    LLMChain = None  # type: ignore
    PromptTemplate = None  # type: ignore
    initialize_agent = None  # type: ignore
    Tool = None  # type: ignore
    AgentExecutor = None  # type: ignore
    RetrievalQA = None  # type: ignore
    VectorStore = None  # type: ignore
    BaseRetriever = None  # type: ignore
else:
    LANGLE_CHAIN_IMPORT_ERROR = None

# Optional LiteLLM wrapper import to allow using LiteLLM as the LangChain LLM.
# This import is lazy and will not fail the module import if the adapter is absent.
try:
    from ai_orchestrator.adapters.litellm_adapter import LiteLLMLangChainWrapper  # type: ignore
    LITE_LLM_ADAPTER_AVAILABLE = True
except Exception:
    LiteLLMLangChainWrapper = None  # type: ignore
    LITE_LLM_ADAPTER_AVAILABLE = False


class LangChainNotAvailableError(ImportError):
    pass


class LangChainPlanner(PlannerInterface):
    """
    Planner that uses a LangChain-style agent to decompose prompts into tasks.
    Adapter supports three modes:
      - Use LangChain's LLMChain when a LangChain LLM is provided.
      - Use a LiteLLM wrapper (LiteLLMLangChainWrapper) if provided as `llm`.
      - Fallback to a simple single-task planner if LLM execution fails.

    The concrete planning strategy should be tailored to your LangChain setup (tools, retriever, prompt).
    """

    def __init__(self, llm: Any = None, agent_tools: Optional[List[Any]] = None, plan_prompt: Optional[str] = None):
        if LANGLE_CHAIN_IMPORT_ERROR:
            raise LangChainNotAvailableError(
                "LangChain is not installed. Install with: pip install langchain[all] "
                "and a provider (e.g. openai) or use the provided requirements file."
            )
        self.llm = llm
        self.agent_tools = agent_tools or []
        self.plan_prompt = plan_prompt or "Decompose the following user intent into a JSON array of tasks with fields: id, type, payload."

        # Prepare prompt/template
        self.template = PromptTemplate(input_variables=["input"], template=self.plan_prompt)

        # If an llm adapter implementing LangChain interface is provided, prefer it.
        # Otherwise, try to use LangChain's LLMChain with the provided llm (if compatible).
        self.chain = None
        try:
            if self.llm is None:
                # No custom llm provided: use LLMChain with default LLM if available
                self.chain = LLMChain(llm=self.llm, prompt=self.template)  # type: ignore
            else:
                # If llm is a LiteLLM LangChain wrapper, we can use it directly (it implements generate/predict)
                if LITE_LLM_ADAPTER_AVAILABLE and isinstance(self.llm, LiteLLMLangChainWrapper):  # type: ignore
                    self.chain = None  # we'll call the wrapper directly in plan()
                else:
                    # Attempt to create an LLMChain with a custom llm (best effort)
                    try:
                        self.chain = LLMChain(llm=self.llm, prompt=self.template)  # type: ignore
                    except Exception:
                        # Fallback to using the llm directly in plan()
                        self.chain = None
        except Exception:
            self.chain = None

    def plan(self, request: RequestMeta) -> List[Dict[str, Any]]:
        # Run the chain or llm wrapper to produce a plan string, then attempt to parse JSON out of it.
        plan_text = ""
        if self.chain is not None:
            try:
                plan_text = self.chain.run({"input": request.prompt})
            except Exception:
                plan_text = ""
        else:
            # Use provided llm wrapper or direct callable/predict/generate as available
            try:
                if self.llm is None:
                    plan_text = ""
                elif hasattr(self.llm, "predict"):
                    plan_text = self.llm.predict(request.prompt)
                elif callable(self.llm):
                    # callable could be a LangChain wrapper or simple function
                    plan_text = self.llm(request.prompt)
                elif hasattr(self.llm, "generate"):
                    gen = self.llm.generate([request.prompt])
                    # try to extract text from the first generation
                    if gen and hasattr(gen, "generations") and len(gen.generations) > 0 and len(gen.generations[0]) > 0:
                        plan_text = getattr(gen.generations[0][0], "text", "")
                    else:
                        plan_text = ""
                else:
                    plan_text = str(self.llm)
            except Exception:
                plan_text = ""

        # The planner is expected to return JSON array. Try to parse; fallback to single task.
        try:
            import json

            parsed = json.loads(plan_text)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            # Fallback: return single llm_analysis task
            return [{"id": f"{request.request_id}-t1", "type": "llm_analysis", "payload": {"prompt": request.prompt}}]


class LangChainRetriever(RetrieverInterface):
    """
    Retriever that uses LangChain-compatible retrievers/vectorstores.
    Accepts either a BaseRetriever or VectorStore adapter and exposes retrieve(request).
    """

    def __init__(self, retriever: Optional["BaseRetriever"] = None, vectorstore: Optional["VectorStore"] = None, top_k: int = 5):
        if LANGLE_CHAIN_IMPORT_ERROR:
            raise LangChainNotAvailableError(
                "LangChain is not installed. Install with: pip install langchain[all] "
                "and a provider (e.g. openai) or use the provided requirements file."
            )
        # Prefer a BaseRetriever if provided, otherwise adapt from vectorstore
        self.retriever = retriever
        self.vectorstore = vectorstore
        self.top_k = top_k

    def retrieve(self, request: RequestMeta) -> Dict[str, Any]:
        """
        Returns a dict with context fields. By default returns the top_k docs as text under 'docs'.
        Integrators should transform docs into the platform's context shape.
        """
        docs_texts = []
        if self.retriever:
            docs = self.retriever.get_relevant_documents(request.prompt)  # type: ignore
            docs_texts = [d.page_content for d in docs]
        elif self.vectorstore:
            # adapter for vectorstore to retriever
            retr = self.vectorstore.as_retriever(search_kwargs={"k": self.top_k})  # type: ignore
            docs = retr.get_relevant_documents(request.prompt)  # type: ignore
            docs_texts = [d.page_content for d in docs]
        else:
            # No retriever configured - return minimal context
            docs_texts = [""]

        return {
            "documents": docs_texts,
            "user_role": request.metadata.get("user_role", "user"),
            "project_context": {"id": request.metadata.get("project_id")},
        }
