import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auditLog, users } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";

const actionVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "muted"> = {
  create: "success",
  update: "info",
  delete: "destructive",
  view: "muted",
  login: "default",
  logout: "muted",
  password_reset: "warning",
  email_change: "warning",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const [countResult, logs] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(auditLog),
    db.select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(pageSize)
    .offset(offset),
  ]);

  const totalCount = countResult[0].count;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Link href="/configuracion" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver a configuración
      </Link>

      <PageHeader
        title="Registro de Auditoría"
        subtitle={`${totalCount} registros`}
      />

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead className="hidden md:table-cell">Entidad</TableHead>
              <TableHead className="hidden lg:table-cell">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Sin registros.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-4 text-xs whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString("es-CL") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AvatarInitials name={log.userName || "Sistema"} size="sm" />
                      <span className="text-sm">{log.userName || "Sistema"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionVariant[log.action] || "muted"}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">
                    {log.details || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/configuracion/auditoria?page=${p}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                p === page ? "bg-rasma-dark text-rasma-lime" : "bg-muted hover:bg-muted/80"
              }`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
