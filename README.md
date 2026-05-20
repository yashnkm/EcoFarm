# EcoFarm SCADA

IoT/SCADA platform for industrial monitoring and control.

```
EcoFarm/
├── ecoFarm/         Spring Boot 3 backend (Java 21, PostgreSQL, MQTT, STOMP/WebSocket)
├── ecofarm-ui/      React + Vite + TanStack Query frontend
├── deploy/          VPS bootstrap + ops docs
└── .github/         CI/CD (GitHub Actions → Hostinger VPS)
```

## Development

```bash
# Backend
cd ecoFarm
./mvnw spring-boot:run

# Frontend (separate terminal)
cd ecofarm-ui
npm install
npm run dev
```

Backend serves on `:8080`, frontend dev server on `:5173` (proxies `/api` and `/ws` to backend).

## Deployment

Push to `prod` branch → GitHub Actions builds + deploys to VPS. See [`deploy/README.md`](deploy/README.md).
