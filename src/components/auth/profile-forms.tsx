"use client";

import { useActionState } from "react";
import { updateName, changePassword, requestEmailChange } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UI } from "@/constants/ui";

export function ProfileForms({ userName }: { userName: string }) {
  return (
    <div className="space-y-6">
      <NameForm currentName={userName} />
      <PasswordForm />
      <EmailForm />
    </div>
  );
}

function NameForm({ currentName }: { currentName: string }) {
  const [state, formAction, isPending] = useActionState(updateName, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{UI.profile.changeName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.success && (
            <p className="text-sm text-rasma-green">
              Nombre actualizado exitosamente.
            </p>
          )}
          {state?.error && (
            <p className="text-sm text-rasma-red">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{UI.patients.firstName}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={currentName}
              required
              minLength={2}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? UI.common.loading : UI.common.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePassword,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{UI.profile.changePassword}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.success && (
            <p className="text-sm text-rasma-green">
              {UI.auth.passwordChanged}
            </p>
          )}
          {state?.error && (
            <p className="text-sm text-rasma-red">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{UI.auth.currentPassword}</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{UI.auth.newPassword}</Label>
            <Input
              id="newPassword"
              name="newPassword"
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
          <Button type="submit" disabled={isPending}>
            {isPending ? UI.common.loading : UI.common.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailForm() {
  const [state, formAction, isPending] = useActionState(
    requestEmailChange,
    undefined
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{UI.profile.changeEmail}</CardTitle>
        <CardDescription>
          {UI.profile.passwordRequiredForEmail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.success && (
            <p className="text-sm text-rasma-green">
              {UI.profile.emailChangeRequested}
            </p>
          )}
          {state?.error && (
            <p className="text-sm text-rasma-red">{state.error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="newEmail">{UI.auth.email}</Label>
            <Input
              id="newEmail"
              name="newEmail"
              type="email"
              required
              placeholder="nuevo@correo.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailCurrentPassword">
              {UI.auth.currentPassword}
            </Label>
            <Input
              id="emailCurrentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? UI.common.loading : UI.common.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
