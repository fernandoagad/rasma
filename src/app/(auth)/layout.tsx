import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-rasma-gray-100">
      <div className="w-full max-w-md px-5">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo-rasma.png"
            alt="RASMA"
            width={72}
            height={72}
            className="rounded-lg shadow-sm"
            priority
          />
          <h1 className="mt-4 text-2xl font-bold text-rasma-dark tracking-tight">
            Fundación Rasma
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Sistema de Gestión Clínica
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
