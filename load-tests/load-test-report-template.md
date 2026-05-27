# StrataDesk Load Test Report

> **Date**: _______________
> **Target**: _______________
> **Tester**: _______________
> **Environment**: Test EC2 / Staging (circle one)

---

## Summary Metrics

| Metric | Baseline (100 VUs) | Moderate (500 VUs) | Read Heavy (1000 VUs) | Write Heavy (1000 VUs) | Combined (1000 VUs) | Chaos (max VUs) |
|--------|--------------------|--------------------|----------------------|----------------------|--------------------|----|
| Max Sustained RPS | | | | | | |
| Max Concurrent VUs | 100 | 500 | 1000 | 1000 | 1000 | |
| Peak CPU % | | | | | | |
| Peak RAM % | | | | | | |
| Peak DB Pool Total | /10 | /10 | /10 | /10 | /10 | /10 |
| Peak DB Pool Waiting | | | | | | |
| Peak DB Pool Active | | | | | | |
| Avg Latency (ms) | | | | | | |
| p95 Latency (ms) | | | | | | |
| p99 Latency (ms) | | | | | | |
| Error Rate % | | | | | | |

---

## Failure Point

| Item | Value |
|------|-------|
| **VU count at first error** | |
| **RPS at first error** | |
| **Error type** | |
| **Timestamp** | |

---

## Top 3 Bottlenecks

> (Change #5 — This becomes your Part 4B roadmap)

### 1. _________________________________

- **Evidence**: 
- **Metric at failure**: 
- **Impact**: 

### 2. _________________________________

- **Evidence**: 
- **Metric at failure**: 
- **Impact**: 

### 3. _________________________________

- **Evidence**: 
- **Metric at failure**: 
- **Impact**: 

---

## Read vs Write Analysis (Change #2)

| Metric | Read-Only (03a) | Write-Only (03b) | Combined (03) |
|--------|----------------|------------------|---------------|
| Avg Latency | | | |
| p95 Latency | | | |
| Error Rate | | | |
| Peak DB Pool Active | | | |
| Peak DB Pool Waiting | | | |

**Conclusion**: [ ] Reads bottleneck first / [ ] Writes bottleneck first / [ ] Both at similar levels

---

## Docker Stats Summary (Change #4)

| Container | Peak CPU % | Peak RAM | Peak Network I/O |
|-----------|-----------|----------|------------------|
| stratadesk-backend | | | |
| stratadesk-postgres | | | |
| stratadesk-frontend | | | |
| stratadesk-prometheus | | | |
| stratadesk-grafana | | | |

---

## Recovery Test Results

| Recovery Stage | Time (seconds) |
|---------------|----------------|
| Health endpoint (200) | |
| Functional (borewells data) | |
| Metrics (active_requests = 0) | |
| **Full recovery** | **         s** |

---

## Failure Classification

- [ ] **Case A — CPU 100%**: Backend bottleneck
- [ ] **Case B — RAM 100%**: Memory leak
- [ ] **Case C — DB Connections exhausted**: Database bottleneck
- [ ] **Case D — Frontend unresponsive**: Rendering bottleneck
- [ ] **Case E — EC2 unreachable**: Infrastructure bottleneck

---

## Decision Gate

### Part 4B Required?

- [ ] **NO** — CPU, RAM, Latency, Database remain healthy → Skip Part 4B
- [ ] **YES** — Bottlenecks identified → Implement targeted Part 4B optimizations

### If YES, Targeted Optimizations:

1. 
2. 
3. 

---

## Raw Data

- [ ] k6 JSON results in `load-tests/logs/`
- [ ] Docker stats CSV in `load-tests/logs/`
- [ ] Backend logs (pre/post) in `load-tests/logs/`
- [ ] Grafana dashboard screenshots saved
- [ ] Prometheus snapshots captured

---

> *"The purpose of Part 5B is to learn exactly how StrataDesk behaves under pressure."*
> *Knowledge. Not uptime.*
