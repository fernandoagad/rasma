import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/recuperar", "/registro"];

const rolePermissions: Record<string, string[]> = {
  admin: ["*"],
  terapeuta: ["/", "/pacientes", "/citas", "/calendario", "/notas", "/planes", "/perfil"],
  recepcionista: ["/", "/pacientes", "/citas", "/calendario", "/pagos", "/perfil"],
  supervisor: ["/", "/pacientes", "/citas", "/calendario", "/notas", "/planes", "/pagos", "/reportes", "/perfil"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) {
    if (req.auth) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  const role = req.auth.user?.role;
  if (role) {
    const allowed = rolePermissions[role] || [];
    if (!allowed.includes("*")) {
      const hasAccess = allowed.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
      if (!hasAccess) {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|eot|css|js|map)$).*)"],
};
