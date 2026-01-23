# QR Code Studio - Agent Briefing Document

## 🎯 Project Overview

**QR Code Studio** is a full-stack web application for creating, managing, and tracking QR codes. The app supports multiple QR code types (URL, vCard, Email, File, Menu) with advanced customization options, analytics, and adaptive QR codes.

**Repository:** `LMNRGroup/qr-je`  
**Tech Stack:** React + TypeScript (Frontend), Hono + Drizzle ORM (Backend), Supabase (Auth + Storage), PostgreSQL (Database)

---

## 📁 Project Structure

```
qr-je/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/     # Main pages (Index.tsx, Login.tsx, etc.)
│   │   ├── components/ # Reusable components
│   │   ├── contexts/  # React contexts (AuthContext)
│   │   ├── lib/       # API client, Supabase client, utils
│   │   └── styles/    # CSS files (mobile-ui-v2.css for mobile-specific styles)
│   └── public/        # Static assets
├── backend/           # Hono API server
│   ├── src/
│   │   ├── domains/   # Domain logic (urls, scans, users, vcards)
│   │   ├── shared/    # Shared utilities (auth middleware)
│   │   └── infra/     # Infrastructure (DB, storage adapters)
│   └── drizzle/       # Database migrations
└── SUPABASE_STORAGE_SETUP.md  # Storage RLS policies setup guide
```

---

## 🔑 Key Technologies

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** + **shadcn/ui** for UI components
- **Framer Motion** for animations
- **React Router** for routing
- **Sonner** for toast notifications

### Backend
- **Hono** framework (lightweight, fast)
- **Drizzle ORM** for database queries
- **PostgreSQL** database
- **Supabase** for authentication and file storage

### Storage & Auth
- **Supabase Auth** for user authentication
- **Supabase Storage** (`qr-assets` bucket) for file uploads
- **Row Level Security (RLS)** policies for storage access

---

## 🏗️ Architecture Patterns

### 1. **Domain-Driven Design (Backend)**
Each domain (urls, scans, users, vcards) has:
- `models.ts` - TypeScript interfaces
- `service.ts` - Business logic
- `handlers.ts` - HTTP request handlers
- `storage/` - Storage adapters (Drizzle, Memory, Supabase)
  - `interface.ts` - Storage interface
  - `drizzle.adapter.ts` - PostgreSQL implementation
  - `memory.adapter.ts` - In-memory (for testing/dev)

### 2. **Storage Adapter Pattern**
Storage is abstracted behind interfaces, allowing easy swapping:
```typescript
// Example: ScansStorage interface
interface ScansStorage {
  createScan(data: CreateScanData): Promise<Scan>;
  getCountsByUser(userId: string): Promise<Record<string, number>>;
  // ... other methods
}
```

### 3. **Mobile UI V2**
The app has a special mobile UI variant controlled by:
- `data-mobile-ui="v2"` attribute on `<html>` element
- CSS in `frontend/src/styles/mobile-ui-v2.css`
- Conditional rendering: `isMobileV2` state/checks

---

## 🔐 Authentication Flow

1. **Frontend:** User signs in via `Login.tsx` → calls `AuthContext.signIn()`
2. **AuthContext:** Uses Supabase client to authenticate
3. **Backend:** All API routes use `authMiddleware` (in `backend/src/shared/http/auth.ts`)
4. **Auth Middleware:**
   - Validates Supabase JWT token
   - Upserts user to database (with 15min cache to reduce DB writes)
   - Attaches `userId` to request context

**Key File:** `backend/src/shared/http/auth.ts` - Contains user sync caching logic

---

## 📊 Key Features & Recent Fixes

### ✅ Recently Fixed Issues

1. **Menu Upload Black Screen** (Latest)
   - Fixed: Modal staying open during upload, preventing accidental closure
   - Files: `frontend/src/pages/Index.tsx` (handleMenuFilesChange, modal backdrop handler)

2. **Unlogged User Profile Menu**
   - Fixed: Only shows "Sign Up" and "Login" buttons for unauthenticated users
   - File: `frontend/src/components/UserMenu.tsx`

3. **Login Animation Performance**
   - Fixed: Replaced heavy particle animation with lightweight CSS animations
   - Removed: `LogoParticleAnimation.tsx` component
   - File: `frontend/src/pages/Login.tsx`

4. **Menu Builder Mobile UI**
   - Fixed: Step-based flow (menu → logo → socials), overflow issues, upload progress
   - File: `frontend/src/pages/Index.tsx`

5. **Storage Management**
   - Implemented: 25MB limit per user, client-side tracking, automatic cleanup on QR deletion
   - Files: `frontend/src/pages/Index.tsx`, `backend/src/domains/urls/handlers.ts`

6. **Cost Control Optimizations**
   - User upsert caching (15min TTL) to reduce DB writes
   - Bulk scan counts endpoint (`GET /scans/counts`) to reduce per-QR queries
   - Files: `backend/src/shared/http/auth.ts`, `backend/src/domains/scans/handlers.ts`

---

## 🗂️ Critical Files to Understand

### Frontend

1. **`frontend/src/pages/Index.tsx`** (LARGE FILE - ~8000+ lines)
   - Main application page
   - Contains: Studio, Arsenal, Analytics, Adaptive QRC, Config tabs
   - Menu builder logic, QR generation, file uploads
   - Mobile UI V2 specific logic

2. **`frontend/src/components/UserMenu.tsx`**
   - Profile dropdown menu
   - Feed/notifications, preferences, sign out
   - Conditional rendering for logged/unlogged users

3. **`frontend/src/contexts/AuthContext.tsx`**
   - Authentication state management
   - Supabase client integration

4. **`frontend/src/lib/api.ts`**
   - API client functions
   - All backend API calls

5. **`frontend/src/styles/mobile-ui-v2.css`**
   - Mobile-specific styles
   - Only applies when `html[data-mobile-ui="v2"]`

### Backend

1. **`backend/src/shared/http/auth.ts`**
   - Authentication middleware
   - User upsert caching logic

2. **`backend/src/domains/urls/handlers.ts`**
   - QR code CRUD operations
   - File cleanup on QR deletion

3. **`backend/src/domains/scans/handlers.ts`**
   - Scan tracking and analytics
   - Bulk counts endpoint

4. **`backend/src/infra/db/schema.ts`**
   - Database schema (Drizzle)

---

## 🚨 Common Issues & Solutions

### 1. **Menu Upload Black Screen**
- **Symptom:** Screen goes black after uploading menu files
- **Cause:** Modal closing or state not updating properly
- **Fix:** Ensure `showMenuBuilder` stays `true`, prevent backdrop clicks during upload

### 2. **Storage 403 Errors**
- **Symptom:** "ROW VIOLATES ROW-LEVEL SECURITY POLICY 403"
- **Cause:** Missing or incorrect Supabase RLS policies
- **Fix:** See `SUPABASE_STORAGE_SETUP.md` for exact policies needed

### 3. **Mobile UI V2 Issues**
- **Check:** Is `data-mobile-ui="v2"` set on `<html>`?
- **Check:** Are styles in `mobile-ui-v2.css` being applied?
- **Pattern:** Use `isMobileV2` state or check `document.documentElement.dataset.mobileUi === 'v2'`

### 4. **Button Clickability Issues**
- **Cause:** Event propagation blocking (`e.stopPropagation()`, `e.preventDefault()`)
- **Fix:** Remove unnecessary event handlers, let native button behavior work

### 5. **Performance Issues**
- **Check:** Heavy animations (use CSS instead of JS)
- **Check:** Too many API calls (use bulk endpoints, caching)
- **Check:** Large file uploads (ensure compression is working)

---

## 📝 Code Patterns to Follow

### 1. **Conditional Mobile V2 Rendering**
```typescript
const [isMobileV2, setIsMobileV2] = useState(false);

useEffect(() => {
  if (typeof window === 'undefined') return;
  const enabled = document.documentElement.dataset.mobileUi === 'v2';
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  setIsMobileV2(enabled && isMobile);
}, []);

// Then use in JSX:
{isMobileV2 ? <MobileComponent /> : <DesktopComponent />}
```

### 2. **File Upload with Progress**
```typescript
const [uploadProgress, setUploadProgress] = useState(0);
const [uploading, setUploading] = useState(false);

// Simulate progress
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => {
    if (prev >= 90) return prev;
    return prev + Math.random() * 10;
  });
}, 200);

// Upload file...
clearInterval(progressInterval);
setUploadProgress(100);
```

### 3. **Storage Tracking**
```typescript
// Add storage usage
window.dispatchEvent(new CustomEvent('qrc:storage-update', { detail: sizeInBytes }));

// Remove storage usage
window.dispatchEvent(new CustomEvent('qrc:storage-remove', { detail: sizeInBytes }));

// Listen for updates
useEffect(() => {
  const handleUpdate = (e: CustomEvent<number>) => {
    setStorageUsage(e.detail);
  };
  window.addEventListener('qrc:storage-update', handleUpdate as EventListener);
  return () => window.removeEventListener('qrc:storage-update', handleUpdate as EventListener);
}, []);
```

### 4. **Error Handling Pattern**
```typescript
try {
  // ... operation
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  toast.error(message);
  // Ensure UI state is consistent
} finally {
  // Cleanup (set loading to false, etc.)
}
```

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase account (for auth + storage)

### Environment Variables

**Backend** (`.env` in `backend/`):
```
DATABASE_URL=postgresql://...
SUPABASE_PROJECT_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Frontend** (`.env` in `frontend/`):
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=http://localhost:3000
```

### Running Locally
```bash
# Backend
cd backend
bun install  # or npm install
bun run dev  # or npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

---

## 📋 Storage Setup (Critical!)

See `SUPABASE_STORAGE_SETUP.md` for complete instructions. Key points:

1. **Bucket:** `qr-assets` (must be public for SELECT, authenticated for INSERT/DELETE)
2. **RLS Policies Required:**
   - INSERT: Authenticated users only, folder structure: `files/`, `menus/`, `logos/`
   - SELECT: Public (anon role) - QR codes need to be readable by anyone
   - DELETE: Authenticated users only

3. **Storage Limits:**
   - 10MB per file (upload limit)
   - 25MB total per user (compressed size tracked client-side)
   - Files automatically deleted when QR code is deleted

---

## 🎨 UI/UX Guidelines

1. **Mobile V2:** Always test on mobile/PWA with `data-mobile-ui="v2"` enabled
2. **No Overflow:** User explicitly stated "NO SECTION, NO PAGE, NO MENU SHOULD OVERFLOW"
3. **Button Clickability:** Buttons must be easily clickable on mobile (no tiny click areas)
4. **Loading States:** Always show progress/loading states for async operations
5. **Error Messages:** Clear, actionable error messages (not generic "Error occurred")

---

## 🐛 Debugging Tips

1. **Check Browser Console:** Look for React errors, API errors, Supabase errors
2. **Check Network Tab:** Verify API calls are succeeding, check response payloads
3. **Check Supabase Dashboard:** Verify RLS policies, storage bucket settings
4. **Mobile Testing:** Use browser dev tools mobile emulation + actual device testing
5. **State Management:** Use React DevTools to inspect component state

---

## 📚 Important Constants

### Frontend (`frontend/src/pages/Index.tsx`)
```typescript
const MAX_STORAGE_BYTES = 25 * 1024 * 1024; // 25MB total
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per file
const MAX_MENU_FILES = 15;
const MAX_MENU_PDF_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_MENU_FILE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_MENU_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB total for menu
```

### Backend (`backend/src/shared/http/auth.ts`)
```typescript
const USER_SYNC_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
```

---

## 🚀 Next Steps for New Agent

1. **Read this briefing completely**
2. **Familiarize yourself with:**
   - `frontend/src/pages/Index.tsx` (main app logic)
   - `frontend/src/components/UserMenu.tsx` (profile menu)
   - `backend/src/shared/http/auth.ts` (auth middleware)
3. **Check recent commits** to understand what was just fixed
4. **Test the app locally** to see current state
5. **Review `SUPABASE_STORAGE_SETUP.md`** if working on file uploads

---

## 📞 Key Context from User Feedback

- **User is preparing for launch** - stability and polish are critical
- **Mobile/PWA is primary focus** - desktop is secondary
- **Performance matters** - avoid heavy animations, optimize API calls
- **User experience is key** - buttons must work, no broken flows
- **Storage costs are a concern** - compression and limits are important

---

## ⚠️ Known Areas Needing Attention

1. **`Index.tsx` is very large** (~8000+ lines) - consider splitting into smaller components
2. **Menu builder flow** - complex state management, may need refactoring
3. **Storage tracking** - client-side only, may need backend validation
4. **Error handling** - some areas may need more robust error recovery
5. **Mobile UI V2** - some desktop features may not be fully adapted for mobile

---

**Last Updated:** Based on commits up to `8a5339f` (menu upload black screen fix)

**Questions?** Check git history, recent commits, and this document. When in doubt, test on actual mobile device with PWA installed.
