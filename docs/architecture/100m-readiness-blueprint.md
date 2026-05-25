# 100M Readiness Blueprint

## Goal

Build a path from the current single-process, per-tenant MongoDB model to a globally distributed, high-throughput platform that can serve up to 100 million users while preserving tenant isolation, low latency, and operational safety.

## Current Constraints

- Per-tenant database creation is already hitting Atlas database-count limits.
- API runtime is a single Node process, so horizontal scale and noisy-neighbor isolation are limited.
- Read-heavy reporting paths currently aggregate directly from operational collections.
- Background jobs run in-process, mixing online request load with async workloads.

## Target SLOs

- p95 API latency: <= 250ms for core reads, <= 500ms for core writes.
- Availability: 99.95% for API and auth services.
- Error budget: <= 0.05% 5xx over rolling 30 days.
- Recovery targets: RTO <= 30 minutes, RPO <= 5 minutes for critical data.

## Architecture Direction

### 1. Data Model Evolution

- Move from per-tenant database to shared logical databases with strict tenant partition keys (`orgId`) on every primary collection.
- Use compound indexes that begin with `orgId` for all high-volume query patterns.
- Introduce archive/retention strategy for historical records and immutable audit streams.
- Keep a tenant metadata/control plane database separate from transactional data.

### 2. Service Decomposition

- Split backend into independently scalable services:
  - Identity and access (auth, sessions, API keys)
  - Transaction core (sales, invoices, inventory, expenses)
  - Reporting and analytics read API
  - Notifications and webhook delivery workers
  - AI orchestration and usage control
- Put all services behind an API gateway with centralized authn/authz and tenant routing.

### 3. Caching and Read Scaling

- Keep Redis as distributed cache and coordination layer.
- Use versioned tenant cache keys for expensive aggregate reads.
- Introduce materialized daily aggregates for dashboard/reporting workloads.
- Add CDN caching for static/public resources where applicable.

### 4. Async and Event-Driven Workloads

- Introduce durable queueing (Kafka/SQS/RabbitMQ) for:
  - Webhook delivery
  - Notifications
  - AI asynchronous tasks
  - Report pre-computation
- Adopt outbox pattern for reliable event publication from transactional writes.
- Move background jobs to dedicated worker deployments with autoscaling.

### 5. Traffic and Reliability Controls

- Multi-layer rate limiting: edge, gateway, and service-level token buckets.
- Global circuit breakers around external providers (email, SMS, AI, media).
- Idempotency keys required for write APIs with at-least-once retry semantics.
- Tenant-aware fairness controls to prevent noisy-neighbor saturation.

### 6. Observability and Operations

- Standardize structured logs with request, tenant, and trace correlation IDs.
- Add RED metrics (Rate, Errors, Duration) and saturation metrics for each service.
- Track cache hit rates, queue lag, job retries, and per-tenant error rates.
- Build runbooks for capacity exhaustion, provider outage, and degraded mode operations.

### 7. Security and Compliance

- Tenant data isolation validated via automated policy tests.
- Encryption at rest and in transit across all storage and queue layers.
- Principle-of-least-privilege service identities and scoped credentials.
- Auditable admin actions and immutable audit ledger export.

## Migration Plan

### Phase 1: Immediate Hardening (0-4 weeks)

- Add versioned report caching and invalidation hooks on tenant writes.
- Add graceful handling for capacity-limit failures.
- Add cache/status telemetry to health endpoints.
- Baseline load tests for read/write/reporting traffic.

### Phase 2: Data and Runtime Refactor (1-3 months)

- Introduce shared-database tenant partition model for new tenants.
- Build migration tooling for existing tenants.
- Externalize background workers to queue-backed services.
- Deploy horizontally scalable stateless API replicas.

### Phase 3: Platform Scale Layer (3-9 months)

- Service decomposition for auth, core transactions, reporting, and messaging.
- Materialized aggregates and analytical read store.
- Multi-region read strategy and global traffic management.

### Phase 4: 100M Production Readiness (9-18 months)

- Regionally isolated fault domains with staged failover drills.
- Peak-event load verification and chaos engineering cadence.
- SLO governance with release gates tied to error budgets.

## Verification Strategy

- Load tests:
  - Steady-state tenant traffic with mixed read/write workloads.
  - Burst traffic with retry storms and downstream dependency failures.
- Resilience tests:
  - Redis degradation and full unavailability.
  - Queue lag spikes and worker crash loops.
  - Mongo primary failover and delayed replication windows.
- Security tests:
  - Tenant boundary fuzz tests and policy regression checks.

## Success Criteria

- New tenant onboarding no longer creates databases per tenant.
- Reporting endpoints maintain p95 <= 250ms at 10x current load.
- Background processing remains stable under replay/retry storms.
- Platform can horizontally scale API and workers without tenant-specific tuning.
