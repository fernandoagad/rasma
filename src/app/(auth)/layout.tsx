import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-rasma-gray-100">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo-rasma.png"
            alt="RASMA"
            width={56}
            height={56}
            className="rounded-xl"
            priority
          />
          <h1 className="mt-3 text-xl font-bold text-rasma-dark tracking-tight">
            Fundacion Rasma
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistema de Gestion Clinica
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
