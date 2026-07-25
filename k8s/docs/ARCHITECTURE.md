# Forecastify Production Kubernetes Architecture Guide

## Overview

This directory contains the production-grade Kubernetes architecture for **Forecastify**, structured according to CNCF standards and DevSecOps best practices.

## Directory Layout

- `base/`: Base Kubernetes manifests (Deployments, Services, HPAs, PDBs, NetworkPolicies, Quotas, ServiceAccounts).
- `overlays/`: Kustomize overlays for `dev`, `staging`, and `production`.
- `gitops/`: ArgoCD Application definitions and automated deployment workflow manifests.
- `helm/`: Helm chart for packaging and multi-cluster deployment.
- `docs/`: Architectural documentation and operational runbooks.

## Security Controls

1. **Pod Security Admission**: Restricted profile enforced at the namespace boundary (`pod-security.kubernetes.io/enforce: restricted`).
2. **Container SecurityContext**: Non-root runtime (`runAsUser: 10001`), read-only root filesystem, dropped Linux capabilities (`drop: ["ALL"]`), default seccomp profile.
3. **Network Policies**: Default deny-all ingress/egress policies with explicit least-privilege allows for ingress controller and external HTTPS APIs.
4. **RBAC**: Dedicated ServiceAccounts per component with `automountServiceAccountToken: false`.

## Observability & Resilience

- **Probes**: Startup, Liveness, and Readiness HTTP health probes on `/api/health`.
- **HPA**: CPU & Memory multi-metric autoscaling.
- **PDB**: PodDisruptionBudgets guarantee minimum availability during node drain or cluster upgrades.
- **Monitoring**: Prometheus ServiceMonitors scrape `/api/health` RED metrics.
