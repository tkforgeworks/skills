---
name: infra-review
description: >
  Reviews infrastructure code, configurations, and deployment manifests for DevOps and
  self-hosted projects. Use this skill whenever the user asks for a review of Kubernetes manifests,
  Helm charts, Docker/Dockerfiles, Terraform/Ansible configs, shell scripts, CI/CD pipelines,
  Proxmox/VM configurations, networking configs (UniFi, VLANs, firewall rules), or monitoring
  setups (Grafana, InfluxDB, Telegraf). Also trigger when the user mentions "review my infra",
  "check my deployment", "look at my k8s manifests", "review my homelab setup", or any
  infrastructure-as-code review request.
---

# Infrastructure Review Skill

A structured infrastructure review skill covering Kubernetes deployments, containers, IaC, CI/CD, and self-hosted virtualization and networking.

## When to Use

- User asks for review of Kubernetes manifests, Helm values, or deployment configs
- User shares Dockerfiles, docker-compose files, or container configurations
- User wants feedback on Terraform, Ansible, or other IaC files
- User asks about shell scripts, CI/CD pipelines, or automation configs
- User wants review of networking, monitoring, or self-hosted infrastructure decisions

## Review Process

1. **Identify what's being reviewed** — K8s manifests? Helm charts? Shell scripts? Network config?
2. **Select the appropriate review lens** (see sections below)
3. **Provide structured feedback** with severity levels: `CRITICAL`, `WARNING`, `SUGGESTION`
4. **Summarize** with a top-level assessment and prioritized action items

---

## Review Lens: Kubernetes & Container Orchestration

### Resource Management
- Are resource `requests` and `limits` defined for all containers?
- Are the values reasonable for the target environment (not over-provisioned)?
- Are PersistentVolumeClaims sized appropriately with correct access modes?

### Security
- Are Secrets used instead of ConfigMaps for sensitive data?
- Is RBAC configured with least-privilege service accounts?
- Are container images pinned to specific versions (not `latest`)?
- Are security contexts set (non-root, read-only filesystem where possible)?
- Are network policies defined to restrict inter-pod communication?

### Configuration
- Are environment-specific values parameterized (not hardcoded)?
- Are ConfigMaps and Secrets referenced correctly?
- Are health checks (liveness, readiness, startup probes) configured?
- Are pod disruption budgets set for critical services?

### Helm Charts
- Are values files clean with sensible defaults?
- Are chart dependencies pinned to specific versions?
- Is the `values.yaml` well-documented with comments?
- Are templates using proper conditionals and helpers?

### Docker / Containers
- Multi-stage builds to minimize image size?
- Non-root user in the final image?
- `.dockerignore` present and comprehensive?
- Layer ordering optimized for cache efficiency?
- If using Jib (for Java services): is the configuration correct and producing minimal layers?

---

## Review Lens: Infrastructure as Code (Terraform / Ansible)

### Terraform
- State management — is remote state configured? State locking enabled?
- Are resources tagged consistently?
- Are sensitive values marked as `sensitive = true`?
- Module structure — are modules reusable and not over-parameterized?
- Are outputs defined for cross-module references?

### Ansible
- Idempotency — will running the playbook twice produce the same result?
- Are handlers used for service restarts instead of inline commands?
- Are variables scoped correctly (group_vars, host_vars, role defaults)?
- Are secrets managed via Ansible Vault?

---

## Review Lens: Shell Scripts & Automation

### Correctness
- Does the script use `set -euo pipefail` (or equivalent error handling)?
- Are variables quoted to prevent word splitting?
- Are temporary files cleaned up (trap handlers)?
- Is the shebang line correct for the intended shell?

### Robustness
- Does the script handle missing dependencies gracefully?
- Are exit codes meaningful and consistent?
- Is logging present for debugging?
- Are destructive operations guarded with confirmation prompts or dry-run modes?

### Portability
- Are scripts hardcoded to a specific environment when they should be parameterized?
- Compatibility across Debian-based distributions if relevant?
- Are paths absolute or relative as appropriate?

---

## Review Lens: Virtualization, Networking & Monitoring

### Proxmox
- VM/LXC resource allocation — are CPU and memory appropriate for the workload?
- Storage configuration — are the correct storage pools used?
- Backup configuration — are critical VMs/containers being backed up?
- HA considerations — are critical services spread across nodes?

### UniFi / Networking
- VLAN segmentation — do changes respect intended isolation between network segments?
- Firewall rule ordering and intent — are rules evaluated in the correct order?
- DNS configuration — are internal DNS records consistent?
- Are management interfaces on a separate VLAN/network?

### Monitoring (Grafana / InfluxDB / Telegraf)
- Are dashboards querying efficiently (not pulling excessive time ranges)?
- Are retention policies configured on InfluxDB?
- Is Telegraf collecting the right metrics without excessive cardinality?
- Are alert rules defined for critical infrastructure (disk space, memory, node health)?

---

## Review Lens: CI/CD Pipelines

### Pipeline Structure
- Are stages ordered correctly (lint → test → build → deploy)?
- Are credentials injected via secrets, not hardcoded?
- Is there a manual approval gate before production deployments?
- Are pipeline files versioned alongside the code they deploy?

### Self-Hosted Runners (Gitea Actions / Act Runner, GitHub Actions)
- Are runner labels configured correctly for the target environment?
- Are workflow triggers appropriate (push, PR, tag)?
- Are artifacts cached between stages where possible?
- If a step calls an LLM API (e.g. AI code review), is it configured with appropriate token limits and its API key stored as a secret?

---

## Output Format

Structure your review as follows:

```
## Summary
(1-2 sentence overall assessment)

## Findings

### CRITICAL
(Issues that must be fixed — security gaps, data loss risks, misconfigurations that will cause failures)

### WARNING
(Issues that should be fixed — resource waste, missing health checks, fragile configurations)

### SUGGESTION
(Nice-to-haves — documentation, naming conventions, optimization opportunities)

## Action Items
(Prioritized list of what to address first)
```

Reference specific files and line numbers where applicable. For multi-file reviews (e.g., a full Helm chart or K8s manifest set), organize findings by component.
