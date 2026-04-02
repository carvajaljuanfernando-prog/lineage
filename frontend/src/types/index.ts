// ── CORE TYPES ────────────────────────────────────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'CLINICIAN'
  | 'COUNSELOR'
  | 'NURSE'
  | 'RESEARCHER'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  specialty?: string
  tenantId: string
  lastLoginAt?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  country: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  isActive: boolean
  createdAt: string
}

export type PatientSex = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN'

export interface Patient {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  sex: PatientSex
  documentType?: string
  documentNum?: string
  dateOfBirth?: string
  email?: string
  phone?: string
  city?: string
  country: string
  referralReason?: string
  clinicalNotes?: string
  isActive: boolean
  createdAt: string
  createdBy?: { firstName: string; lastName: string }
  surveyTokens?: SurveyToken[]
  familyTree?: FamilyTree
  clinicalRecord?: ClinicalRecord
}

export type TokenStatus =
  | 'PENDING' | 'SENT' | 'OPENED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'REVIEWED'

export interface SurveyToken {
  id: string
  token: string
  patientId: string
  templateId: string
  status: TokenStatus
  expiresAt: string
  sentAt?: string
  openedAt?: string
  completedAt?: string
  createdAt: string
  template?: { name: string; category: string }
}

export interface SurveyTemplate {
  id: string
  name: string
  slug: string
  description?: string
  category: string
  isGlobal: boolean
  schema: any
}

export interface FamilyTree {
  id: string
  patientId: string
  members: FamilyMember[]
  updatedAt: string
}

export interface FamilyMember {
  id: string
  familyTreeId: string
  relationship: string
  firstName?: string
  lastName?: string
  sex: PatientSex
  dateOfBirth?: string
  ageAtRecord?: number
  isAlive: boolean
  ageAtDeath?: number
  causeOfDeath?: string
  hasCardiacHistory: boolean
  cardiacDescription?: string
  generation: number
  positionX?: number
  positionY?: number
}

export type VariantClassification =
  | 'PATHOGENIC'
  | 'LIKELY_PATHOGENIC'
  | 'VUS'
  | 'LIKELY_BENIGN'
  | 'BENIGN'

export interface GeneticVariant {
  id: string
  gene: string
  hgvsCoding?: string
  hgvsProtein?: string
  hgvsGenomic?: string
  classification: VariantClassification
  zygosity?: string
  isVUS: boolean
  clinvarId?: string
  notes?: string
  createdAt: string
  reclassifications?: VUSReclassification[]
}

export interface VUSReclassification {
  id: string
  previousClass: VariantClassification
  newClass: VariantClassification
  source: string
  evidenceSummary?: string
  reclassifiedAt: string
}

export interface ClinicalRecord {
  id: string
  patientId: string
  clinicalSummary?: string
  phenotypes: PhenotypeEntry[]
  variants: GeneticVariant[]
}

export interface PhenotypeEntry {
  id: string
  hpoCode?: string
  hpoTerm: string
  status: 'PRESENT' | 'ABSENT' | 'UNKNOWN'
  notes?: string
}

// ── AUTH ──────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
}

// ── API RESPONSES ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
}
