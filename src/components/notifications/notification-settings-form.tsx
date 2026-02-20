"use client";

import { useActionState, useState } from "react";
import { updateNotificationSettings, sendTestNotification } from "@/actions/notifications";

interface Props {
  settings: Record<string, string>;
}

export function NotificationSettingsForm({ settings }: Props) {
  const [state, action, pending] = useActionState(updateNotificationSettings, undefined);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await sendTestNotification();
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        {/* Master toggle */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-rasma-dark mb-4">General</h3>
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Notificaciones por Email</p>
              <p className="text-xs text-muted-foreground">Habilitar/deshabilitar todas las notificaciones</p>
            </div>
            <input
              type="checkbox"
              name="notifications_enabled"
              defaultChecked={settings.notifications_enabled === "true"}
              className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
            />
          </label>
        </div>

        {/* Event toggles */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-rasma-dark mb-4">Eventos que envían notificaciones</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cita creada</p>
                <p className="text-xs text-muted-foreground">Cuando se agenda una nueva cita</p>
              </div>
              <input
                type="checkbox"
                name="notify_appointment_created"
                defaultChecked={settings.notify_appointment_created === "true"}
                className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cita modificada</p>
                <p className="text-xs text-muted-foreground">Cuando se modifica fecha, horario o modalidad de una cita</p>
              </div>
              <input
                type="checkbox"
                name="notify_appointment_updated"
                defaultChecked={settings.notify_appointment_updated === "true"}
                className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cita cancelada</p>
                <p className="text-xs text-muted-foreground">Cuando se cancela una cita</p>
              </div>
              <input
                type="checkbox"
                name="notify_appointment_cancelled"
                defaultChecked={settings.notify_appointment_cancelled === "true"}
                className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cambio de estado de cita</p>
                <p className="text-xs text-muted-foreground">Cuando una cita cambia a completada, no asistió, etc.</p>
              </div>
              <input
                type="checkbox"
                name="notify_appointment_status"
                defaultChecked={settings.notify_appointment_status === "true"}
                className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Pago registrado</p>
                <p className="text-xs text-muted-foreground">Cuando se registra un pago</p>
              </div>
              <input
                type="checkbox"
                name="notify_payment_received"
                defaultChecked={settings.notify_payment_received === "true"}
                className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cambio de estado de pago</p>
                <p className="text-xs text-muted-foreground">Cuando cambia el estado de un pago (pagado, cancelado, etc.)</p>
              </div>
              <input
                type="checkbox"
                name="notify_payment_status"
                defaultChecked={settings.notify_payment_status === "true"}
                className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Plan de tratamiento</p>
                <p className="text-xs text-muted-foreground">Cuando se crea o cambia el estado de un plan de tratamiento</p>
              </div>
              <input
                type="checkbox"
                name="notify_treatment_plan"
                defaultChecked={settings.notify_treatment_plan === "true"}
                className="h-5 w-5 rounded border-gray-300 text-rasma-teal focus:ring-rasma-teal"
              />
            </label>
          </div>
        </div>

        {/* Reminder settings */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold text-rasma-dark mb-4">Recordatorios de Citas</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Horas antes de la cita (por defecto)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="reminder_hours_default"
                min={1}
                max={72}
                defaultValue={settings.reminder_hours_default || "24"}
                className="border rounded-lg px-3 py-2 text-sm w-24"
              />
              <span className="text-sm text-muted-foreground">horas</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Los pacientes pueden tener configuración personalizada. Este valor se usa como predeterminado.
            </p>
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">Configuración guardada correctamente.</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-6 py-2.5 bg-rasma-dark text-rasma-lime rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {pending ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>
      </form>

      {/* Test email */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold text-rasma-dark mb-2">Probar Email</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Envía un correo de prueba a su email para verificar que la configuración funciona.
        </p>
        <button
          onClick={handleTestEmail}
          disabled={testing}
          className="px-4 py-2 bg-rasma-teal text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {testing ? "Enviando..." : "Enviar Email de Prueba"}
        </button>
        {testResult?.success && (
          <p className="text-sm text-green-600 mt-2">Email de prueba enviado correctamente.</p>
        )}
        {testResult?.error && (
          <p className="text-sm text-red-600 mt-2">{testResult.error}</p>
        )}
      </div>
    </div>
  );
}
