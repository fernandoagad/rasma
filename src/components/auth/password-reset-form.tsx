"use client";

import { useActionState, useState, useTransition } from "react";
import {
  requestPasswordResetCode,
  verifyResetCode,
  resetPasswordWithCode,
  resetPassword,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UI } from "@/constants/ui";
import Link from "next/link";
import { ArrowLeft, Mail, KeyRound, Lock, CheckCircle, Loader2 } from "lucide-react";

// ── Multi-step code-based recovery ──

type Step = "email" | "code" | "password" | "done";

export function PasswordRecoveryFlow() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleRequestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await requestPasswordResetCode(email);
      if (result.error) {
        setError(result.error);
      } else {
        setStep("code");
      }
    });
  }

  function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await verifyResetCode(email, code);
      if (result.error) {
        setError(result.error);
      } else {
        setStep("password");
      }
    });
  }

  function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;
    startTransition(async () => {
      const result = await resetPasswordWithCode(email, code, password, confirmPassword);
      if (result.error) {
        setError(result.error);
      } else {
        setStep("done");
      }
    });
  }

  function handleResendCode() {
    setError("");
    startTransition(async () => {
      await requestPasswordResetCode(email);
    });
  }

  // ── Step 1: Enter email ──
  if (step === "email") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 text-blue-600 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-rasma-dark">Recuperar contrasena</h2>
            <p className="text-sm text-muted-foreground">Ingrese su correo para recibir un codigo</p>
          </div>
        </div>

        <form onSubmit={handleRequestCode} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{UI.auth.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 font-semibold"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "Enviando..." : "Enviar codigo"}
          </Button>
          <div className="text-center">
            <Link href="/login" className="text-sm text-rasma-teal hover:text-rasma-teal/80 transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> {UI.auth.backToLogin}
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // ── Step 2: Enter code ──
  if (step === "code") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-50 text-amber-600 shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-rasma-dark">Ingrese el codigo</h2>
            <p className="text-sm text-muted-foreground">Enviamos un codigo de 6 digitos a <span className="font-medium text-rasma-dark">{email}</span></p>
          </div>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">Codigo de verificacion</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              required
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending || code.length !== 6}
            className="w-full bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 font-semibold"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "Verificando..." : "Verificar codigo"}
          </Button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Cambiar correo
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isPending}
              className="text-sm text-rasma-teal hover:text-rasma-teal/80 transition-colors"
            >
              Reenviar codigo
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Step 3: New password ──
  if (step === "password") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-50 text-green-600 shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-rasma-dark">Nueva contrasena</h2>
            <p className="text-sm text-muted-foreground">Ingrese su nueva contrasena</p>
          </div>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">{UI.auth.newPassword}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{UI.auth.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 font-semibold"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPending ? "Guardando..." : "Establecer contrasena"}
          </Button>
        </form>
      </div>
    );
  }

  // ── Step 4: Done ──
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-50 text-green-600">
          <CheckCircle className="h-7 w-7" />
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-rasma-dark">Contrasena actualizada</h2>
        <p className="text-sm text-muted-foreground mt-1">Su contrasena fue restablecida exitosamente.</p>
      </div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-rasma-teal hover:text-rasma-teal/80 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesion
      </Link>
    </div>
  );
}

// ── Legacy token-based form (for /recuperar/[token] route) ──

export function NewPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    async (
      _prevState: { error?: string; success?: boolean } | undefined,
      formData: FormData
    ) => {
      formData.set("token", token);
      return resetPassword(_prevState, formData);
    },
    undefined
  );

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-green-50 text-green-600">
            <CheckCircle className="h-7 w-7" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-rasma-dark">Contrasena actualizada</h2>
          <p className="text-sm text-muted-foreground mt-1">{UI.auth.passwordChanged}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-rasma-teal hover:text-rasma-teal/80 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {UI.auth.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">{UI.auth.newPassword}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{UI.auth.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 font-semibold"
      >
        {isPending ? UI.common.loading : UI.auth.newPasswordButton}
      </Button>
    </form>
  );
}
