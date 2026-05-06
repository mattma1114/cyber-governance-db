import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LogIn, CheckCircle2, XCircle, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";

export default function InvitePage() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token ?? "";
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [consumed, setConsumed] = useState(false);

  // Validate the invite token
  const { data: validation, isLoading: validating } = trpc.invites.validate.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  // Consume invite mutation
  const consumeMutation = trpc.invites.consume.useMutation({
    onSuccess: () => {
      setConsumed(true);
      toast.success("邀请码已激活，您已获得管理员权限！");
    },
    onError: (err) => {
      toast.error(err.message || "激活失败，请重试");
    },
  });

  // Auto-consume when user is logged in and invite is valid
  useEffect(() => {
    if (user && validation?.valid && !consumed && !consumeMutation.isPending && !consumeMutation.isSuccess) {
      consumeMutation.mutate({ token });
    }
  }, [user, validation?.valid, consumed]);

  const handleLogin = () => {
    // Pass the invite path as returnPath so OAuth redirects back here after login
    window.location.href = getLoginUrl(`/invite/${token}`);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-muted-foreground">无效的邀请链接</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-primary font-semibold text-lg">
            <ShieldCheck className="w-6 h-6" />
            互联网平台治理数据库
          </div>
          <p className="text-sm text-muted-foreground mt-1">管理员邀请</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">管理员邀请码</CardTitle>
                <CardDescription className="text-xs mt-0.5">激活后您将获得网站管理员权限</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Validation status */}
            {validating ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在验证邀请码…
              </div>
            ) : validation?.valid === false ? (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>邀请码无效：{validation.reason}</span>
              </div>
            ) : consumed || consumeMutation.isSuccess ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>邀请码已激活！您已获得管理员权限。</span>
                </div>
                <Button className="w-full" onClick={() => navigate("/admin")}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  进入管理后台
                </Button>
              </div>
            ) : validation?.valid ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">有效邀请码</Badge>
                  </div>
                  {validation.note && (
                    <p className="text-xs text-muted-foreground mt-1">备注：{validation.note}</p>
                  )}
                </div>

                {authLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : user ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground text-center">
                      当前登录账号：<span className="font-medium text-foreground">{user.name}</span>
                    </div>
                    {consumeMutation.isPending ? (
                      <Button className="w-full" disabled>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        激活中…
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => consumeMutation.mutate({ token })}>
                        <Crown className="w-4 h-4 mr-2" />
                        激活管理员权限
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">
                      请先登录以激活管理员权限
                    </p>
                    <Button className="w-full" onClick={handleLogin}>
                      <LogIn className="w-4 h-4 mr-2" />
                      登录并激活
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          每个邀请码只能使用一次 · 激活后权限立即生效
        </p>
      </div>
    </div>
  );
}
