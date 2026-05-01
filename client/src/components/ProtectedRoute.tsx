import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShieldCheck, LogIn, AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-20 flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-6 w-64" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">需要登录</h2>
        <p className="text-muted-foreground mb-6 text-sm">请先登录以访问此页面</p>
        <Button asChild size="lg">
          <a href={getLoginUrl()}>
            <LogIn className="w-4 h-4 mr-2" />
            立即登录
          </a>
        </Button>
      </div>
    );
  }

  if (requireAdmin && user?.role !== "admin") {
    return (
      <div className="container py-20 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">权限不足</h2>
        <p className="text-muted-foreground mb-6 text-sm">您没有访问管理员后台的权限</p>
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
