# 🎓 IMAMU Helper

A comprehensive academic companion application designed for Imam Mohammad Ibn Saud Islamic University (IMAMU) students.

---

## 🛠️ Getting Started

### 1. Installation
```bash
npm install
```

### 2. Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Start
```bash
# Build Next.js application & server bundle
npm run build

# Start production server
npm start
```

---

## 🧪 Automated Testing

Execute the multi-tier automated test suite:

```bash
# Run all automated tests (51 test cases)
npm test

# Run individual test tiers
npm run test:tier1   # Feature Coverage Tests
npm run test:tier2   # Boundary & Edge Cases
npm run test:tier3   # Infrastructure & Dual DB Tests
npm run test:tier4   # Real-World Scenarios
```

---

## 🐳 Docker Deployment & Shell Access

To build the Docker image with native `bash` shell support and exec into running containers:

```bash
# Rebuild docker container image with bash support
docker compose build --no-cache

# Run container stack
docker compose up -d

# Exec into container terminal via bash or sh
docker exec -it imamu-helper bash
# or
docker compose exec app bash
```

### Stack services

| Service | Port | Notes |
|---|---|---|
| `app` | 3005 | IMAMU Helper |
| `postgres` | 5432 | PostgreSQL 17, data in `/AppData/IMAMU/_DB` |
| `databasus` | 4005 | Backups, state in `/AppData/IMAMU/Backupapp` |
| `umami` | 3006 | Web analytics |
| `open-studio` | 8080 | DB viewer, opt-in: `docker compose --profile dbview up -d open-studio` |

Full setup, backup configuration and the CockroachDB → PostgreSQL data
migration steps are in [`deploy/STACK.md`](deploy/STACK.md).

---

## ☸️ Kubernetes & Scalability

The application is fully containerized and architected for high availability and horizontal scaling across multiple pods:

- **Horizontal Pod Autoscaler (HPA)**: Auto-scales from 2 to 10 replicas based on CPU/memory demand.
- **Stateless Architecture**: Authenticates via stateless JWT tokens with centralized S3 object storage.
- **Resilience & Probes**: Kubernetes liveness (`/healthz`) and readiness (`/readyz`) probes with zero-downtime rolling updates.
- **Connection Pooling**: Configurable PostgreSQL connection pools per pod replica to avoid pool exhaustion.

Full Kubernetes manifests, kustomize configuration, and operations documentation are in [`deploy/KUBERNETES.md`](deploy/KUBERNETES.md).

```bash
# Deploy to Kubernetes cluster via Kustomize
kubectl apply -k deploy/k8s
```

