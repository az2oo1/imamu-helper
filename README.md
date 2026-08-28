# 🎓 IMAMU Helper

A comprehensive academic companion application designed for Imam Mohammad Ibn Saud Islamic University (IMAMU) students.

---

## 🚀 CLI Setup & Management Wizard

Use the interactive terminal wizard to manage users, bypass email verification, audit security, or remove SMTP configuration from `.env` files:

```bash
# Interactive setup menu
npm run wizard

# Direct user creation wizard
npm run create-user
```

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

## 🐳 Docker Support

Run with Docker Compose:

```bash
# Start container stack
docker compose up -d

# Execute commands inside container (using sh)
docker compose exec app sh
```
