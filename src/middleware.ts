import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const openRoutes = ["/postular"];

const publicRoutes = ["/login", "/recuperar", "/registro"];

const rolePermissions: Record<string, string[]> = {
  admin: ["*"],
  terapeuta: ["/", "/pacientes", "/citas", "/calendario", "/notas", "/planes", "/perfil"],
  recepcionista: ["/", "/pacientes", "/citas", "/calendario", "/pagos", "/perfil"],
  supervisor: ["/", "/pacientes", "/citas", "/calendario", "/notas", "/planes", "/pagos", "/reportes", "/perfil"],
  rrhh: ["/", "/rrhh", "/perfil"],
  paciente: ["/", "/mis-citas", "/perfil", "/pendiente"],
  invitado: ["/pendiente", "/perfil"],
};

// Roles that get redirected away from "/" to their own landing page
const roleHomeRedirects: Record<string, string> = {
  paciente: "/mis-citas",
  invitado: "/pendiente",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow open routes (accessible to everyone, auth or not, no redirect)
  const isOpen = openRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isOpen) {
    return NextResponse.next();
  }

  // Allow public routes
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublic) {
    if (req.auth) {
      const role = req.auth.user?.role;
      const homeRedirect = role ? roleHomeRedirects[role] : undefined;
      return NextResponse.redirect(new URL(homeRedirect || "/", req.nextUrl));
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

  // Redirect paciente/invitado from "/" to their landing page
  if (role && pathname === "/" && roleHomeRedirects[role]) {
    return NextResponse.redirect(new URL(roleHomeRedirects[role], req.nextUrl));
  }

  if (role) {
    const allowed = rolePermissions[role] || [];
    if (!allowed.includes("*")) {
      const hasAccess = allowed.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      );
      if (!hasAccess) {
        // Redirect to role-appropriate home instead of "/"
        const home = roleHomeRedirects[role] || "/";
        return NextResponse.redirect(new URL(home, req.nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|woff2?|ttf|eot|css|js|map)$).*)"],
};
