import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

const Index = lazy(() => import('@/pages/Index'));
const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const MenuViewer = lazy(() => import('@/pages/MenuViewer'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Support = lazy(() => import('@/pages/Support'));
const DataDeletion = lazy(() => import('@/pages/DataDeletion'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const VCard = lazy(() => import('@/pages/VCard'));
const FileViewer = lazy(() => import('@/pages/FileViewer'));

const ROUTES = [
  { path: '/', element: <Index /> },
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/terms', element: <Terms /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/support', element: <Support /> },
  { path: '/data-deletion', element: <DataDeletion /> },
  { path: '/faq', element: <FAQ /> },
  { path: '/v/:slug', element: <VCard /> },
  { path: '/file/:id/:random', element: <FileViewer /> },
  { path: '/menu/:id/:random', element: <MenuViewer /> },
] as const;

function RouteFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {ROUTES.map((route) => (
          <Route key={route.path} path={route.path} element={route.element} />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
