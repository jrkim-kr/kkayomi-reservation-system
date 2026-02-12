"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createAdminBrowserClient } from "@/lib/supabase/admin-client";
import { Button, Card } from "@/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  not_admin: "관리자 권한이 없는 계정입니다.",
  auth_failed: "로그인에 실패했습니다. 다시 시도해 주세요.",
};

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [error, setError] = useState(ERROR_MESSAGES[errorParam ?? ""] ?? "");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    const supabase = createAdminBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/admin/auth/callback`,
      },
    });

    if (error) {
      setError("Google 로그인 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-bold text-warm-gray-800">
          관리자 로그인
        </h1>
        <p className="mb-8 text-sm text-warm-gray-500">
          관리자 계정으로 로그인해 주세요
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-error">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          isLoading={loading}
          onClick={handleGoogleLogin}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google 계정으로 로그인
        </Button>

        <p className="mt-6 text-xs text-warm-gray-400">
          관리자 권한이 있는 계정만 접근할 수 있습니다.
        </p>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-warm-gray-400">로딩 중...</p>
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
