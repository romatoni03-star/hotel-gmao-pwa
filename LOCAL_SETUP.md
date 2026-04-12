# Hotel GMAO PWA - Local Development Setup

## Project Overview

**Hotel GMAO PWA** es una aplicación web progresiva (PWA) para gestión de mantenimiento hotelero. Permite a técnicos y administradores:

- Completar checklists diarios de sistemas críticos (HVAC, electricidad, fontanería, piscina, etc.)
- Registrar incidencias con prioridad y seguimiento
- Crear y cerrar órdenes de trabajo (OT)
- Exportar reportes en PDF
- Acceso offline con sincronización automática

**Stack tecnológico:**
- Frontend: React 19 + Tailwind CSS 4 + tRPC
- Backend: Express 4 + Node.js
- Base de datos: MySQL/TiDB
- ORM: Drizzle
- Autenticación: OAuth (Manus)

---

## Database Schema

### 1. `users` - Usuarios del sistema

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('admin', 'technician', 'director') DEFAULT 'technician',
  hotelId INT DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Roles:**
- `admin` - Jefe de mantenimiento (acceso total)
- `technician` - Técnico (acceso a sus asignaciones)
- `director` - Dirección (acceso de lectura)

---

### 2. `checklists` - Checklists diarios

```sql
CREATE TABLE checklists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  hotelId INT DEFAULT 1,
  date VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
  completionRate INT DEFAULT 0,
  data JSON NOT NULL,  -- Record<itemId, {checked, status, note, timestamp}>
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Estructura de `data` JSON:**
```json
{
  "hvac-temp": {
    "checked": true,
    "status": "ok",
    "note": "Temperatura normal",
    "timestamp": "2026-04-12T10:30:00Z"
  },
  "electrical-panels": {
    "checked": false,
    "status": "ok",
    "note": "",
    "timestamp": null
  }
}
```

**Items por defecto (18 total):**
- HVAC: temperatura, filtros, ruido
- Electricidad: cuadros, SAI, iluminación
- Fontanería: presión, fugas, ACS
- Piscina: pH, filtración, bombas
- Inspección: impacto huésped, back-of-house, habitaciones
- Seguridad: incendios, extintores, salidas

---

### 3. `incidents` - Incidencias reportadas

```sql
CREATE TABLE incidents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  incidentId VARCHAR(20) UNIQUE NOT NULL,  -- INC-XXXXXX
  userId INT NOT NULL,
  hotelId INT DEFAULT 1,
  area VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  status ENUM('open', 'in-progress', 'closed') DEFAULT 'open',
  photoUrl VARCHAR(512),  -- S3 URL
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closedAt TIMESTAMP NULL,
  closedByUserId INT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### 4. `workOrders` - Órdenes de trabajo

```sql
CREATE TABLE workOrders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  workOrderId VARCHAR(20) UNIQUE NOT NULL,  -- WO-XXXXXX
  createdByUserId INT NOT NULL,
  assignedTechnicianId INT NULL,
  hotelId INT DEFAULT 1,
  area VARCHAR(32) NOT NULL,
  type ENUM('preventive', 'corrective') NOT NULL,
  description TEXT,
  status ENUM('open', 'in-progress', 'closed') DEFAULT 'open',
  costEstimate DECIMAL(10, 2),
  costActual DECIMAL(10, 2),
  timeSpentMinutes INT,
  notes TEXT,
  signatureUrl VARCHAR(512),  -- S3 URL
  date VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
  closedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### 5. `notifications` - Notificaciones

```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  hotelId INT DEFAULT 1,
  type ENUM('critical_incident', 'work_order_assigned', 'checklist_reminder', 'system_alert') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  relatedIncidentId INT,
  relatedWorkOrderId INT,
  read BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Environment Variables

### Required for Local Development

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/hotel_gmao

# OAuth / Authentication
VITE_APP_ID=<your-manus-app-id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login
JWT_SECRET=<your-jwt-secret-key>

# Owner Information
OWNER_OPEN_ID=<your-open-id>
OWNER_NAME=<your-name>

# Manus Built-in APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=<your-api-key>
VITE_FRONTEND_FORGE_API_KEY=<your-frontend-api-key>
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=<analytics-url>
VITE_ANALYTICS_WEBSITE_ID=<website-id>

# App Configuration
VITE_APP_TITLE=Hotel GMAO
VITE_APP_LOGO=<logo-url>
```

### Where to Get Values

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Your MySQL/TiDB connection string |
| `VITE_APP_ID` | Manus Dashboard → OAuth Apps |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `OWNER_OPEN_ID` | Your Manus account ID |
| `BUILT_IN_FORGE_API_KEY` | Manus Dashboard → API Keys |

---

## Local Development Setup

### 1. Prerequisites

```bash
# Node.js 22.13.0+
node --version

# pnpm 10.4.1+
npm install -g pnpm
pnpm --version

# MySQL 8.0+ or compatible database
mysql --version
```

### 2. Clone & Install

```bash
# Extract the ZIP file
unzip hotel-gmao-pwa.zip
cd hotel-gmao-pwa

# Install dependencies
pnpm install
```

### 3. Configure Environment

```bash
# Create .env.local file
cat > .env.local << 'EOF'
DATABASE_URL=mysql://root:password@localhost:3306/hotel_gmao
VITE_APP_ID=your-app-id
JWT_SECRET=$(openssl rand -base64 32)
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login
OWNER_OPEN_ID=your-open-id
OWNER_NAME=Your Name
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge
VITE_APP_TITLE=Hotel GMAO
EOF
```

### 4. Database Setup

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE hotel_gmao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
pnpm db:push
```

### 5. Start Development Server

```bash
# Terminal 1: Backend + Frontend
pnpm dev

# Server runs on: http://localhost:3000
# Frontend dev server: http://localhost:5173 (Vite)
```

### 6. Run Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch
```

---

## Project Structure

```
hotel-gmao-pwa/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utilities (hotel-gmao.ts, trpc.ts)
│   │   ├── _core/hooks/      # useAuth, custom hooks
│   │   └── index.css         # Global styles
│   └── public/               # Static assets
├── server/                    # Express backend
│   ├── _core/                # Framework core (OAuth, context, etc.)
│   ├── routers/              # tRPC procedures
│   │   ├── gmao.ts           # Main GMAO procedures
│   │   └── gmao-export.ts    # PDF export
│   ├── db.ts                 # Database queries
│   └── *.test.ts             # Tests
├── drizzle/                   # Database schema & migrations
│   ├── schema.ts             # Table definitions
│   └── migrations/           # SQL migrations
├── shared/                    # Shared types & constants
└── package.json              # Dependencies
```

---

## Key API Endpoints (tRPC)

### Checklist

```typescript
// Get today's checklist
trpc.gmao.checklist.getToday.useQuery()

// Update checklist item
trpc.gmao.checklist.updateItem.useMutation({
  checklistId: number,
  itemId: string,
  patch: { checked?, status?, note?, timestamp? }
})
```

### Work Orders

```typescript
// Create work order
trpc.gmao.workOrder.create.useMutation({
  area: string,
  type: 'preventive' | 'corrective',
  date: string,
  costEstimate?: number
})

// List work orders
trpc.gmao.workOrder.list.useQuery()

// Update status
trpc.gmao.workOrder.updateStatus.useMutation({
  workOrderId: number,
  status: 'open' | 'in-progress' | 'closed',
  timeSpentMinutes?: number,
  notes?: string
})
```

### Incidents

```typescript
// Create incident
trpc.gmao.incident.create.useMutation({
  area: string,
  description: string,
  priority: 'low' | 'medium' | 'high' | 'critical'
})

// List incidents
trpc.gmao.incident.list.useQuery()

// Update status
trpc.gmao.incident.updateStatus.useMutation({
  incidentId: number,
  status: 'open' | 'in-progress' | 'closed'
})
```

---

## Common Issues & Solutions

### Issue: "Database connection failed"
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1;"

# Verify DATABASE_URL format
# mysql://user:password@host:port/database
```

### Issue: "OAuth callback not working"
```bash
# Ensure VITE_APP_ID and JWT_SECRET are set
# Check OAUTH_SERVER_URL is accessible
# Verify redirect URL in OAuth app settings
```

### Issue: "Checklist returns null"
```bash
# Fixed in latest version - auto-creates with default items
# If still issues, run: pnpm db:push
```

### Issue: "Cannot find module 'trpc'"
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/gmao.test.ts

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

**Test files:**
- `server/gmao.test.ts` - GMAO procedures
- `server/gmao-behavioral.test.ts` - Behavioral tests
- `server/auth.oauth.test.ts` - OAuth flow
- `server/auth.logout.test.ts` - Logout

---

## Build & Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Output: dist/index.js
```

---

## Support & Documentation

- **Manus Docs:** https://docs.manus.im
- **tRPC Docs:** https://trpc.io
- **Drizzle Docs:** https://orm.drizzle.team
- **React Docs:** https://react.dev

---

## License

MIT
