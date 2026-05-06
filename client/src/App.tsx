import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppThemeProvider } from "./contexts/AppThemeContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Eagerly loaded: lightweight pages that appear on first visit
import Home from "./pages/Home";
import NotFound from "@/pages/NotFound";

// Lazily loaded: heavy pages loaded on demand to reduce initial bundle
const Cases = lazy(() => import("./pages/Cases"));
const CaseDetail = lazy(() => import("./pages/CaseDetail"));
const Platforms = lazy(() => import("./pages/Platforms"));
const PlatformDetail = lazy(() => import("./pages/PlatformDetail"));
const About = lazy(() => import("./pages/About"));
const Legal = lazy(() => import("./pages/Legal"));
const Admin = lazy(() => import("./pages/Admin"));
const CaseEditor = lazy(() => import("./pages/CaseEditor"));
const PlatformEditor = lazy(() => import("./pages/PlatformEditor"));
const Invite = lazy(() => import("./pages/Invite"));

// Loading fallback: minimal spinner that matches the dark theme
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">加载中…</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/cases" component={Cases} />
        <Route path="/cases/:id" component={CaseDetail} />
        <Route path="/platforms" component={Platforms} />
        <Route path="/platforms/:id" component={PlatformDetail} />
        <Route path="/about" component={About} />
        <Route path="/legal" component={Legal} />
        <Route path="/invite/:token" component={Invite} />
        <Route path="/admin">
          <ProtectedRoute requireAdmin>
            <Admin />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cases/new">
          <ProtectedRoute requireAdmin>
            <CaseEditor />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cases/:id/edit">
          <ProtectedRoute requireAdmin>
            <CaseEditor />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/platforms/new">
          <ProtectedRoute requireAdmin>
            <PlatformEditor />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/platforms/:id/edit">
          <ProtectedRoute requireAdmin>
            <PlatformEditor />
          </ProtectedRoute>
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AppThemeProvider>
          <TooltipProvider>
            <Toaster />
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Router />
              </main>
            </div>
          </TooltipProvider>
        </AppThemeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
