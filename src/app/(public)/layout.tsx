import Image from "next/image";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-rasma-gray-100">
      <div className="w-full max-w-2xl px-4 py-12">
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
            Fundación Rasma
          </h1>
          <p className="text-sm text-muted-foreground">
            Especialistas en TEA y Salud Mental
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
