#!/usr/bin/env python3
"""
Run a smoke test for the ai-orchestrator package and write JSON output to smoke_output.log
This script is intentionally standalone so its output file can be inspected after execution.
"""
import os
import traceback
import json
import time

os.environ['AI_ORCHESTRATOR_USE_LANGCHAIN'] = 'true'
os.environ['AI_ORCHESTRATOR_USE_LITELLM'] = 'true'

out = []
out.append({"env": {k: v for k, v in os.environ.items() if k.startswith("AI_ORCHESTRATOR") or k.startswith("LITELL")}})

try:
    from ai_orchestrator.orchestrator import EnhancedAIOrchestrator, RequestMeta
    out.append({"import": "orchestrator OK"})
    try:
        o = EnhancedAIOrchestrator()
        out.append({"orchestrator_instance": type(o).__name__})
        rm = RequestMeta(request_id="r1", user_id="u1", organization_id="org1", conversation_id=None, prompt="Generate a JSON plan for testing", metadata={})
        try:
            resp = o.route_request(rm)
            out.append({"route_status": getattr(resp, "status", None), "used_services": getattr(resp, "used_services", None)})
        except Exception as e:
            out.append({"route_error": str(e), "trace": traceback.format_exc()})
    except Exception as e:
        out.append({"orchestrator_init_error": str(e), "trace": traceback.format_exc()})
except Exception as e:
    out.append({"import_error": str(e), "trace": traceback.format_exc()})

# Also try importing adapters
for mod in ("ai_orchestrator.adapters.langchain_adapter", "ai_orchestrator.adapters.litellm_adapter"):
    try:
        m = __import__(mod, fromlist=['*'])
        attrs = {}
        for a in ("LANGCHAIN_ADAPTER_AVAILABLE", "LITE_LLM_ADAPTER_AVAILABLE", "LangChainPlanner", "LiteLLMLangChainWrapper", "LiteLLMClientAdapter"):
            if hasattr(m, a):
                try:
                    val = getattr(m, a)
                    # Represent callable types simply
                    if callable(val):
                        attrs[a] = f"callable:{getattr(val,'__name__',type(val))}"
                    else:
                        attrs[a] = repr(val)
                except Exception:
                    attrs[a] = "<unreprable>"
        out.append({mod: attrs})
    except Exception as e:
        out.append({mod + "_import_error": str(e), "trace": traceback.format_exc()})

# Write to file in current directory
with open("smoke_output.log", "w", encoding="utf-8") as f:
    f.write(json.dumps(out, indent=2))

print("WROTE smoke_output.log")
time.sleep(0.05)
