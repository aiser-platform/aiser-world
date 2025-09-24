## Aiser Platform – Execution Roadmap  

### Vision
AI‑native BI that beats legacy tools by delivering trustworthy NL→SQL→Insight→Chart→Action and text‑to‑dashboard creation, securely and at enterprise scale.

### Current State (quick assessment)
- Chat2Chart backend: solid scaffolding; integrated path exists but includes mock placeholders and fallbacks in places like `integrated_chat2chart_service` (schema modeling/insights), and basic chart fallbacks. ECharts generation endpoint now authenticated, cached, validated, and deterministic.
- Data layer: multi‑engine query service exists; real DB execution available; needs broader coverage, input validation, and tests.
- AI layer: `UnifiedAIAnalyticsService`, `AgenticAnalysisEngine`, `LiteLLMService` present; need confidence scoring, structured validations, and safety guardrails consistently applied.
- Dash Studio (client): visually rich but missing production wiring for all widgets, filters, publish/embed workflows, and full persistence; fallbacks to sample data still present.
- Security/Platform: JWT present; CORS tightened; rate limiting service exists but not applied uniformly; RBAC needs consistent enforcement; audit trails incomplete.
- Observability: Prometheus in place; needs task‑level metrics and NL→SQL→chart timing KPIs.

### Guiding Principles
- Real over mock: remove stubs; hide behind feature flags only when necessary with owners and removal dates.
- Accuracy > novelty: deterministic AI paths; validate outputs structurally and semantically; safe fallbacks.
- Enterprise posture: authN/Z, audit, limits, data privacy by default.
- Performance first: cache, pushdown, pre‑aggregation; paginate/virtualize UI.

---

### Milestone 1: Correctness & Security Hardening (Week 1)
- Enforce JWT + RBAC on all data/AI/chart endpoints; standardize dependencies.
- Apply rate‑limiting middleware to AI endpoints; return standard `X‑RateLimit-*` headers.
- Validate/normalize ECharts configs server‑side and client pre‑render.
- Input validation for queries (parameterized SQL paths, size limits, timeouts); redact sensitive fields in logs.
- Expand CORS to env‑driven allowlist (done), add CSP guidance for production Nginx.
- Deliverables: passing integration tests for auth+limits; OWASP checklist; endpoint matrix of protections.

Acceptance criteria
- 100% protected endpoints in routers; tests asserting 401/403/429 paths.
- ECharts options never crash client; schema validation unit tests.

### Milestone 2: Data Foundation & Query Layer (Week 2)
- Solidify `DataSourcesCRUD` and real execution: transactional flows, error handling, schema retrieval normalization.
- Multi‑engine query selection policies; Redis caching for repeatable results; pagination for large results.
- Add schema introspection endpoints and column statistics for better AI planning.
- Deliverables: `/data/sources/*` tested; `/data/query/execute` engine coverage; dataset schemas exposed with sampling.

Acceptance criteria
- Integration tests across Postgres/MySQL (docker) green; max result limits enforced; caching hit‑rate metric exposed.

### Milestone 3: NL→SQL→Data→Chart→Insight E2E (Week 3)
- Wire `AIOrchestrator` SQL generation to real schema context; enforce safe SQL (read‑only, time range defaults, LIMIT).
- Route data results into `charts/generate` with MCP/ECharts; ensure validated options; add confidence score + rationale.
- Business insight generation with structure and guardrails; include fallback deterministic insights.
- Deliverables: `/chats/chat` and `/ai/analyze` tests that produce valid charts against seed datasets.

Acceptance criteria
- Golden tests: same NL prompt yields stable chart types and options; confidence + rationale returned.

### Milestone 4: Dash Studio MVP Completion (Week 4)
- Replace sample data fallbacks with real data binding for chart/table/KPI widgets.
- Implement global filter system and widget‑level bindings; persist dashboards/widgets/layout to backend.
- Publish/unpublish and embed tokens end‑to‑end (backend exists; finalize client flows).
- Export/import (JSON) with schema validation.
- Deliverables: users can build a dashboard from real data, save, share, embed, filter.

Acceptance criteria
- No mock pathways in Dashboard Studio; E2E Cypress test: connect→query→add widget→save→publish→embed renders.

### Milestone 5: Enterprise AuthN/Z & Governance (Week 5)
- Organization/project scoping on all reads/writes; least‑privilege RBAC policies.
- SSO/SAML (phase 1), API keys for service accounts, audit events for data access/AI actions.
- Deliverables: org/project tenancy boundaries with tests; admin role management; audit logs accessible.

Acceptance criteria
- Cross‑tenant access tests fail correctly; audit trail contains user, resource, action, status.

### Milestone 6: Performance & Observability (Week 6)
- Query latency budgets, async job offload for heavy tasks, pre‑aggregation hooks (Cube.js where applicable).
- Prometheus metrics: NL parse time, SQL gen time, DB time, chart gen time, cache hit rate.
- Frontend: virtualization for large tables, memoization, bundle analysis/code‑split.
- Deliverables: dashboards for SLOs; p95 API < 500ms; documented scaling playbook.

Acceptance criteria
- Load test 200 RPS mixed queries; error rate <1%; p95 <500ms for standard queries.

### Milestone 7: Text‑to‑Dashboard (Week 7‑8)
- Orchestrate multi‑widget plans from a single NL prompt; propose layout; confirm; build dashboard programmatically.
- Safety: guard against over‑fetching; cap widgets; reuse cached results.
- Deliverables: `/ai/text-to-dashboard` behind feature flag; UX flow in Studio.

Acceptance criteria
- Given sample dataset, prompt creates a 3‑5 widget dashboard with correct bindings and filters in <15s.

---

### De‑Mock Plan (tracked)
- `integrated_chat2chart_service`: replace mock modeling/insight code paths with Unified AI + real data schema; remove placeholders.
- Dashboard Studio: remove sample data returns in `getWidgetData` when a data source/query is present; keep fallback only for demo mode (feature flag).
- Document and tag all stubs with owners and removal dates.

### Testing Strategy
- Unit: schema validators, ECharts option validator, SQL optimizer.
- Integration: `/data`, `/charts`, `/cube`, `/ai` happy/edge paths; JWT/RBAC/429.
- E2E: NL→SQL→chart flow; Dashboard Studio build/share/embed; smoke tests across browsers.

### KPIs
- Reliability: error rate <1%; failed chart renders <0.5%.
- Performance: p95 API <500ms (standard), p95 chart gen <1.5s with cached data.
- Quality: 80%+ coverage on core services; 100% of endpoints documented.
- UX: Time‑to‑first‑chart < 20s from cold start; Dashboard save < 1s.

### Dependencies & Config
- Redis required for caching; set `REDIS_URL` or `REDIS_HOST/PORT/DB`.
- CORS via `CORS_ORIGINS` (comma‑separated); production CSP in Nginx configs.
- Temperature defaults ≤ 0.3 for production AI flows unless justified.

### Immediate Next Actions (this week)
1) Add rate‑limiting middleware to AI routes; tests for 429.
2) Add ECharts client‑side pre‑render validation layer in ChartWidget.
3) Replace sample fallbacks in Dashboard Studio when a data source/query is provided.
4) Add integration tests for `/ai/echarts/generate` and NL→SQL path.
5) Document endpoint auth/RBAC matrix in `aiser-platform-context.md` and docs site.


