"use client";

import { useActionState } from "react";
import { createIncome } from "@/actions/income";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UI } from "@/constants/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Heart,
  Landmark,
  Handshake,
  PartyPopper,
  FileCheck,
  MoreHorizontal,
  Upload,
  FileText,
  X,
  Sparkles,
} from "lucide-react";

const CATEGORIES = [
  { value: "donacion", label: "Donación", icon: Heart },
  { value: "subvencion", label: "Subvención", icon: Landmark },
  { value: "patrocinio", label: "Patrocinio", icon: Handshake },
  { value: "evento_benefico", label: "Evento Benéfico", icon: PartyPopper },
  { value: "convenio", label: "Convenio", icon: FileCheck },
  { value: "otro_ingreso", label: "Otro Ingreso", icon: MoreHorizontal },
] as const;

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getFirstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function IncomeForm() {
  const [state, action, pending] = useActionState(createIncome, undefined);
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getToday);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) router.push("/ingresos");
  }, [state?.success, router]);

  const suggestions = useMemo(() => {
    if (!description || description.length < 2) return [];
    const q = description.toLowerCase();
    return UI.incomePresets.filter((p) =>
      p.label.toLowerCase().includes(q)
    );
  }, [description]);

  function applyPreset(preset: { label: string; category: string }) {
    setDescription(preset.label);
    setCategory(preset.category);
    setShowSuggestions(false);
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('input[name="amount"]')?.focus();
    }, 50);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setReceiptFile(file);
  }

  function clearFile() {
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form action={action} className="space-y-5">
      {/* Quick Presets */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Ingresos frecuentes
        </p>
        <div className="flex flex-wrap gap-2">
          {UI.incomePresets.map((preset) => {
            const isActive =
              description === preset.label && category === preset.category;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? "bg-rasma-dark text-rasma-lime border-rasma-dark"
                    : "bg-white text-rasma-dark border-border hover:border-rasma-teal hover:bg-rasma-teal/5"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Description + Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Descripción y Categoría
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-1">
              Descripción *
            </label>
            <input
              type="text"
              name="description"
              required
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Ej: Donación empresa XYZ"
              autoComplete="off"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyPreset(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                  >
                    <span>{s.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {UI.income.categories[s.category]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category icon buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Categoría *
            </label>
            <input type="hidden" name="category" value={category} />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? "border-rasma-teal bg-rasma-teal/10 text-rasma-dark"
                        : "border-transparent bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/60"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isSelected ? "text-rasma-teal" : ""}`}
                    />
                    <span className="text-[11px] font-medium leading-tight">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amount + Date + Donor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Monto, Fecha y Donante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Monto (CLP) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <input
                  type="number"
                  name="amount"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500.000"
                  className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha *</label>
              <input
                type="date"
                name="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>
          </div>
          {/* Quick date buttons */}
          <div className="flex gap-2">
            {[
              { label: "Hoy", fn: getToday },
              { label: "Ayer", fn: getYesterday },
              { label: "Inicio de mes", fn: getFirstOfMonth },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => setDate(btn.fn())}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition ${
                  date === btn.fn()
                    ? "bg-rasma-dark text-rasma-lime border-rasma-dark"
                    : "bg-white text-rasma-dark border-border hover:bg-muted/50"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {/* Donor + Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre del Donante
              </label>
              <input
                type="text"
                name="donorName"
                placeholder="Ej: María González"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                N° de Referencia
              </label>
              <input
                type="text"
                name="referenceNumber"
                placeholder="Ej: TRF-2026-001"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt + Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Comprobante y Notas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Comprobante (opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              name="receipt"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {receiptFile ? (
              <div className="flex items-center gap-3 border rounded-lg p-3 bg-rasma-teal/5 border-rasma-teal/20">
                <FileText className="h-5 w-5 text-rasma-teal shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {receiptFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(receiptFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="shrink-0 p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-rasma-dark"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-rasma-teal/40 hover:bg-rasma-teal/5 transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">
                  Subir comprobante
                </span>
                <span className="text-xs">JPG, PNG, WebP o PDF. Máx 10 MB</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
            />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !description || !category || !amount || !date}
        className="w-full bg-rasma-dark text-rasma-lime py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40 text-sm"
      >
        {pending ? "Registrando..." : "Registrar Ingreso"}
      </button>
    </form>
  );
}
