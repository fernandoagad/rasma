import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PendientePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-xl">
            Cuenta pendiente de aprobación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tu cuenta ha sido registrada exitosamente. Un administrador revisará
            tu solicitud y te asignará un rol pronto.
          </p>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium text-rasma-dark">
              {session.user.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.user.email}
            </p>
          </div>
          <form action={logoutAction}>
            <Button variant="outline" className="w-full" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
