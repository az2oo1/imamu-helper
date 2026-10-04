# ☸️ Kubernetes Deployment & Horizontal Scalability Guide

This guide covers deploying, scaling, and operating **IMAMU Helper** in production on Kubernetes clusters (such as Amazon EKS, Google GKE, Azure AKS, k3s, or self-hosted bare-metal Kubernetes).

---

## 🏗️ Architecture for High Availability & Scalability

```
                                [ Public Traffic ]
                                        │
                                        ▼
                            [ Ingress Controller (TLS) ]
                                        │
                                        ▼
                              [ ClusterIP Service ]
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
         [ Pod: Replica 1 ]     [ Pod: Replica 2 ]     [ Pod: Replica N ]
         (imamu-helper)         (imamu-helper)         (imamu-helper)
                 │                      │                      │
                 ├──────────────────────┴──────────────────────┤
                 │                                             │
                 ▼                                             ▼
       [ PostgreSQL Database ]                      [ S3 Object Storage ]
    (In-cluster or Managed RDS/CloudSQL)        (Garage, MinIO, or AWS S3)
```

### Key Scalability Features:
1. **Stateless Pods**: All authentication uses stateless JWTs signed by `JWT_SECRET`. Any pod can authenticate and serve any request.
2. **Centralized Object Storage**: All media uploads and study plans are stored in S3/Garage object storage rather than local ephemeral container storage.
3. **Database Connection Pooling**: Each pod configures an elastic PostgreSQL connection pool tuned via `DB_POOL_MAX` and `DB_POOL_MIN` to avoid connection exhaustion.
4. **Distributed Task Locking**: Background tasks (such as Telegram news scraping) utilize PostgreSQL advisory locks (`pg_try_advisory_lock`), ensuring only one pod executes the cron job at any given time.
5. **Horizontal Pod Autoscaler (HPA)**: Automatically scales pods between 2 and 10 based on CPU (75%) and memory (80%) utilization.
6. **Zero-Downtime Rolling Updates**:
   - `RollingUpdate` strategy (`maxSurge: 1`, `maxUnavailable: 0`).
   - `preStop` lifecycle sleep hook allows kube-proxy and ingress controllers to drain endpoints before `SIGTERM`.
   - Native `SIGTERM` / `SIGINT` graceful shutdown drains existing connections within `SHUTDOWN_TIMEOUT_MS` (default 15s) and cleanly closes database pools.
7. **Probes**:
   - **Liveness Probe**: `/healthz` (checks process uptime).
   - **Readiness Probe**: `/readyz` (checks database connectivity; returns 503 during pod termination so traffic routing immediately halts).

---

## 📁 Kubernetes Manifest Structure (`deploy/k8s/`)

| Manifest | Purpose |
|---|---|
| `namespace.yaml` | Creates isolated `imamu` namespace |
| `configmap.yaml` | Non-sensitive runtime configuration & scaling parameters |
| `secret.yaml` | Sensitive passwords, JWT secret, and S3 credentials |
| `deployment.yaml` | Multi-replica web application deployment with security contexts & probes |
| `service.yaml` | Internal ClusterIP service routing to pods on port 3000 |
| `ingress.yaml` | Ingress configuration with TLS support and nginx annotations |
| `hpa.yaml` | Horizontal Pod Autoscaler definition |
| `pdb.yaml` | Pod Disruption Budget guaranteeing at least 1 pod is available |
| `postgres.yaml` | In-cluster PostgreSQL 17 StatefulSet + PVC (for standalone clusters) |
| `garage.yaml` | In-cluster S3 Object Storage Deployment + PVC (for standalone clusters) |
| `kustomization.yaml` | Kustomize bundle for single-command deployment |

---

## 🚀 Quickstart Deployment

### 1. Configure Secrets & Config
Review and edit [`deploy/k8s/secret.yaml`](deploy/k8s/secret.yaml) and [`deploy/k8s/configmap.yaml`](deploy/k8s/configmap.yaml):
- Set a strong `JWT_SECRET` (at least 32 random characters).
- Set `SQL_PASSWORD` and `DATABASE_URL`.
- Set `APP_URL` to your production domain.

Alternatively, create secrets securely via `kubectl`:
```bash
kubectl create namespace imamu

kubectl create secret generic imamu-secret \
  --namespace=imamu \
  --from-literal=JWT_SECRET="your-secure-random-jwt-secret-key" \
  --from-literal=SQL_PASSWORD="your-strong-db-password" \
  --from-literal=DATABASE_URL="postgresql://imamu:your-strong-db-password@imamu-postgres:5432/imamu?sslmode=disable" \
  --from-literal=S3_ACCESS_KEY_ID="your-s3-access-key" \
  --from-literal=S3_SECRET_ACCESS_KEY="your-s3-secret-key"
```

### 2. Apply Manifests
Deploy the entire stack with Kustomize:
```bash
kubectl apply -k deploy/k8s
```

Or apply individually:
```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/secret.yaml
kubectl apply -f deploy/k8s/postgres.yaml
kubectl apply -f deploy/k8s/garage.yaml
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service.yaml
kubectl apply -f deploy/k8s/ingress.yaml
kubectl apply -f deploy/k8s/hpa.yaml
kubectl apply -f deploy/k8s/pdb.yaml
```

### 3. Verify Pods and Services
```bash
kubectl get pods,svc,ingress,hpa -n imamu
```

Check the rollout status:
```bash
kubectl rollout status deployment/imamu-helper -n imamu
```

---

## ⚙️ Scalability Tuning Parameters

The following environment variables in `configmap.yaml` govern cluster performance:

| Variable | Default | Purpose |
|---|---|---|
| `DB_POOL_MAX` | `10` | Maximum PostgreSQL client connections per pod replica. Total DB connections = `replicas * DB_POOL_MAX`. |
| `DB_POOL_MIN` | `2` | Minimum idle connections kept warm per pod replica. |
| `DB_POOL_IDLE_TIMEOUT_MS` | `10000` | Closes idle connections after 10s to free DB server resources. |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | Timeout when establishing new DB connection before failing request. |
| `DISABLE_PGLITE_FALLBACK` | `true` | When `true`, disables local in-memory/disk PGlite fallback to avoid split-brain states across pods. |
| `DISABLE_BACKGROUND_WORKERS` | `false` | When `true`, stops background cron scrapers on API pods (useful if running a dedicated worker pod). |
| `TRUST_PROXY` | `1` | Configures Express reverse proxy trust for real client IP rate limiting behind ingress. |
| `SHUTDOWN_TIMEOUT_MS` | `15000` | Duration to wait for in-flight requests to complete before hard termination. |

---

## 🔄 Zero-Downtime Rolling Deployments

To update the application image:
```bash
kubectl set image deployment/imamu-helper app=ghcr.io/az2oo1/imamu-helper:v1.2.0 -n imamu
```

To restart the deployment and trigger rolling replacement:
```bash
kubectl rollout restart deployment/imamu-helper -n imamu
```

To rollback in case of an issue:
```bash
kubectl rollout undo deployment/imamu-helper -n imamu
```

---

## 📊 Autoscaling Operations

Check autoscaling status:
```bash
kubectl get hpa imamu-helper-hpa -n imamu
```

Manually override replicas for traffic spikes:
```bash
kubectl scale deployment imamu-helper --replicas=6 -n imamu
```
