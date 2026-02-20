"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { POSITION_OPTIONS } from "@/lib/validations/applicant";
import { UI } from "@/constants/ui";
import { Upload, CheckCircle, Loader2, FileText } from "lucide-react";

export function ApplicantForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function togglePosition(pos: string) {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Complete todos los campos obligatorios.");
      return;
    }
    if (positions.length === 0) {
      setError("Seleccione al menos un puesto.");
      return;
    }
    if (!file) {
      setError("Adjunte su currículum o carta de presentación.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo no debe exceder 10 MB.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("positions", JSON.stringify(positions));
      formData.append("file", file);

      const res = await fetch("/api/postular", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al enviar la postulación.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center py-8 text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h3 className="text-lg font-semibold text-rasma-dark">¡Postulación enviada!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {UI.applicantForm.success}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{UI.applicantForm.name} *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: María González"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{UI.applicantForm.email} *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.cl"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{UI.applicantForm.phone} *</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+56 9 1234 5678"
          required
        />
      </div>

      <div className="space-y-3">
        <Label>{UI.applicantForm.positions} *</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {POSITION_OPTIONS.map((pos) => (
            <label
              key={pos}
              className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors text-sm"
            >
              <Checkbox
                checked={positions.includes(pos)}
                onCheckedChange={() => togglePosition(pos)}
              />
              <span>{pos}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{UI.applicantForm.cv} *</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 h-auto py-3"
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <>
              <FileText className="h-4 w-4 text-rasma-teal" />
              <span className="truncate">{file.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Seleccionar archivo (PDF, DOC, DOCX, máx. 10 MB)</span>
            </>
          )}
        </Button>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          UI.applicantForm.submit
        )}
      </Button>
    </form>
  );
}
