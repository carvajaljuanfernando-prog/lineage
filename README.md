# 🧬 Lineage — Clinical Genomics Platform

Plataforma SaaS multi-tenant para equipos clínicos de genética médica y cardiología.
Diseñada para el manejo de cardiopatías familiares y enfermedades hereditarias.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | NestJS + Prisma ORM |
| Base de datos | PostgreSQL |
| Autenticación | JWT propio (access + refresh tokens) |
| Deploy Backend | Railway |
| Deploy Frontend | Vercel |
| CI/CD | GitHub Actions |

---

## Estructura del Proyecto

```
lineage/
├── backend/               ← API NestJS
│   ├── src/
│   │   ├── auth/          ← Autenticación JWT
│   │   ├── users/         ← Gestión de usuarios
│   │   ├── tenants/       ← Centros clínicos
│   │   ├── patients/      ← Registro de pacientes
│   │   ├── surveys/       ← Motor de encuestas dinámicas
│   │   ├── pedigree/      ← Generación de pedigrí
│   │   └── common/        ← Prisma, guards, decoradores
│   └── prisma/
│       ├── schema.prisma  ← Modelo de datos completo
│       └── seed.ts        ← Datos iniciales
└── frontend/              ← React SPA
    └── src/
        ├── pages/         ← auth, dashboard, patients, surveys
        ├── components/    ← Layout, UI
        ├── lib/           ← API client, Zustand store
        └── types/         ← TypeScript interfaces
```

---

## Configuración Local

### 1. Clonar y instalar dependencias

```bash
git clone https://github.com/carvajaljuanfernando-prog/lineage.git
cd lineage
npm install
```

### 2. Configurar el backend

```bash
cd backend
cp .env.example .env
# Editar .env con su DATABASE_URL y JWT_SECRET
```

### 3. Base de datos

Necesita PostgreSQL corriendo localmente o en Railway.

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

Esto crea:
- El schema completo de la base de datos
- La plantilla global de encuesta para Cardiomiopatías Familiares
- Un tenant de demo para desarrollo:
  - **Slug:** `demo`
  - **Email:** `admin@lineage.demo`
  - **Password:** `lineage2024`

### 4. Correr en desarrollo

```bash
# Desde la raíz del proyecto
npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- Swagger API docs: `http://localhost:3000/api/docs`

---

## Variables de Entorno

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://user:pass@host:5432/lineage"
JWT_SECRET="un-secreto-largo-y-seguro"
JWT_EXPIRES_IN="15m"
PORT=3000
FRONTEND_URL="http://localhost:5173"
RESEND_API_KEY="re_xxxxxxxxxxxx"
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL="http://localhost:3000"
```

---

## Deploy en Railway (Backend)

1. Crear nuevo proyecto en [railway.app](https://railway.app)
2. Agregar servicio **PostgreSQL**
3. Agregar servicio desde GitHub → seleccionar este repo → carpeta `backend`
4. Configurar las variables de entorno en Railway
5. Railway detecta NestJS automáticamente con `npm run start`

## Deploy en Vercel (Frontend)

1. Importar el repo en [vercel.com](https://vercel.com)
2. Configurar **Root Directory:** `frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Agregar variable de entorno: `VITE_API_URL` = URL del backend en Railway

---

## Módulos del Sistema

### Fase 1 — Activo ✅
- Registro de centros clínicos (multi-tenant)
- Autenticación JWT con roles diferenciados
- Registro de pacientes
- Motor de encuestas dinámicas con tokens de un solo uso
- Generación automática de pedigrí familiar desde respuestas de encuesta

### Fase 2 — En desarrollo 🔧
- Repositorio clínico por caso
- Entrada de variantes genéticas (nomenclatura HGVS)
- Clasificación ACMG/AMP

### Fase 3 — Planificado 📋
- Seguimiento automático de VUS (ClinVar, gnomAD, LOVD)
- Alertas de reclasificación cada 6 meses
- Módulo de asesoría genética

### Fase 4 — Roadmap 🗺️
- Panel multi-tenant para administración global
- Portal de investigadores con datos anonimizados
- Exportación FHIR R4
- Preparación GDPR para expansión internacional

---

## Roles del Sistema

| Rol | Permisos |
|---|---|
| `SUPER_ADMIN` | Acceso total a todos los tenants |
| `TENANT_ADMIN` | Administración del centro clínico |
| `CLINICIAN` | Genetista / Cardiólogo — acceso completo a casos |
| `COUNSELOR` | Consejero genético — acceso a encuestas y pedigrí |
| `NURSE` | Enfermería / admin — registro de pacientes |
| `RESEARCHER` | Solo datos anonimizados |

---

## Estándares Clínicos

- **HGVS** — Nomenclatura de variantes genéticas
- **ACMG/AMP 2015** — Clasificación de variantes (5 categorías)
- **HPO** — Human Phenotype Ontology para fenotipado
- **FHIR R4** — Preparado para interoperabilidad (Fase 4)

---

Desarrollado por Juan Fernando Carvajal Estupiñán, MD  
Cardiólogo · Semillero CardioUDES · Instituto del Corazón de Bucaramanga
