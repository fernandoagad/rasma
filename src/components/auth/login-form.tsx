"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loginAction, googleSignInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UI } from "@/constants/ui";
import Link from "next/link";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push("/");
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <div className="space-y-4">
      {/* Google Sign In */}
      <form action={googleSignInAction}>
        <Button
          type="submit"
          variant="outline"
          className="w-full font-medium"
        >
          <GoogleIcon className="mr-2 h-5 w-5" />
          {UI.auth.loginWithGoogle}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-muted-foreground">
            {UI.auth.orContinueWith}
          </span>
        </div>
      </div>

      {/* Credentials form */}
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">
            {UI.auth.email}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="correo@ejemplo.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            {UI.auth.password}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 font-semibold"
        >
          {isPending ? UI.common.loading : UI.auth.loginButton}
        </Button>

        <div className="text-center space-y-2">
          <Link
            href="/recuperar"
            className="text-sm text-rasma-teal hover:text-rasma-teal/80 transition-colors block"
          >
            {UI.auth.forgotPassword}
          </Link>
          <div>
            <span className="text-sm text-muted-foreground">¿No tiene cuenta? </span>
            <Link
              href="/registro"
              className="text-sm text-rasma-teal hover:text-rasma-teal/80 transition-colors font-medium"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
