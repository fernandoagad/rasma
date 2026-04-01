import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBookableSpecialties } from "@/actions/patient-booking";
import { getMyProfessionals } from "@/actions/patient-portal";
import { BookingFlow } from "./booking-flow";
import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";

export default async function AgendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "paciente") redirect("/mis-citas");

  const [specialties, professionals] = await Promise.all([
    getBookableSpecialties(),
    getMyProfessionals(),
  ]);

  const hasCareTeam = professionals.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/mis-citas"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a mis citas
      </Link>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
          <CalendarPlus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-rasma-dark tracking-tight">Agendar cita</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Seleccione especialidad, fecha y profesional</p>
        </div>
      </div>

      {specialties.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center max-w-lg mx-auto">
          <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <CalendarPlus className="h-7 w-7 text-blue-500" />
          </div>
          <p className="text-base font-bold text-rasma-dark">
            {hasCareTeam ? "Horarios aun no disponibles" : "Sin equipo de atencion asignado"}
          </p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
            {hasCareTeam
              ? "Sus terapeutas aun no han configurado horarios de disponibilidad. Contactelos directamente para agendar."
              : "Aun no tiene profesionales asignados. Contacte a la fundacion para que lo vincule con un terapeuta."
            }
          </p>
          <Link
            href="/mis-citas"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-rasma-dark hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a mis citas
          </Link>
        </div>
      ) : (
        <BookingFlow specialties={specialties} />
      )}
    </div>
  );
}
