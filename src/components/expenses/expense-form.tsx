"use client";

import { useActionState } from "react";
import { createExpense, updateExpense } from "@/actions/expenses";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UI } from "@/constants/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home,
  Zap,
  Package,
  Wrench,
  Shield,
  Megaphone,
  Monitor,
  UserCheck,
  MoreHorizontal,
  Upload,
  FileText,
  X,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const CATEGORIES = [
  { value: "arriendo", label: "Arriendo", icon: Home },
  { value: "servicios_basicos", label: "Servicios Básicos", icon: Zap },
  { value: "suministros", label: "Suministros", icon: Package },
  { value: "mantenimiento", label: "Mantenimiento", icon: Wrench },
  { value: "seguros", label: "Seguros", icon: Shield },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "software", label: "Software", icon: Monitor },
  { value: "personal", label: "Personal", icon: UserCheck },
  { value: "otros", label: "Otros", icon: MoreHorizontal },
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

interface ExpenseData {
  id: string;
  description: string;
  amount: number; // in cents
  category: string;
  date: string;
  notes: string | null;
  receiptFileName: string | null;
  receiptViewLink: string | null;
}

export function ExpenseForm({ expense }: { expense?: ExpenseData }) {
  const isEdit = !!expense;
  const [state, action, pending] = useActionState(
    isEdit ? updateExpense : createExpense,
    undefined
  );
  const router = useRouter();

  const [description, setDescription] = useState(expense?.description || "");
  const [category, setCategory] = useState(expense?.category || "");
  const [amount, setAmount] = useState(
    expense ? String(expense.amount / 100) : ""
  );
  const [date, setDate] = useState(expense?.date || getToday);
  const [notes, setNotes] = useState(expense?.notes || "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) router.push("/gastos");
  }, [state?.success, router]);

  // Filter presets matching the description input
  const suggestions = useMemo(() => {
    if (!description || description.length < 2) return [];
    const q = description.toLowerCase();
    return UI.expensePresets.filter((p) =>
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
    if (file) setRemoveReceipt(false);
  }

  function clearFile() {
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasExistingReceipt =
    isEdit && expense?.receiptFileName && !removeReceipt;

  return (
    <form action={action} className="space-y-5">
      {/* Hidden id for edit mode */}
      {isEdit && <input type="hidden" name="id" value={expense.id} />}
      {removeReceipt && (
        <input type="hidden" name="removeReceipt" value="true" />
      )}

      {/* Quick Presets */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Gastos frecuentes
        </p>
        <div className="flex flex-wrap gap-2">
          {UI.expensePresets.map((preset) => {
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
          {/* Description with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">
              Descripción *
            </label>
            <input
              ref={descriptionRef}
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
              placeholder="Ej: Pago arriendo oficina enero"
              autoComplete="off"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
            />
            {/* Suggestions dropdown */}
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
                      {UI.expenses.categories[s.category]}
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
            <div className="grid grid-cols-4 gap-2">
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

      {/* Amount + Date */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Monto y Fecha</CardTitle>
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
                  placeholder="150.000"
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
            <button
              type="button"
              onClick={() => setDate(getToday())}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition ${
                date === getToday()
                  ? "bg-rasma-dark text-rasma-lime border-rasma-dark"
                  : "bg-white text-rasma-dark border-border hover:bg-muted/50"
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setDate(getYesterday())}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition ${
                date === getYesterday()
                  ? "bg-rasma-dark text-rasma-lime border-rasma-dark"
                  : "bg-white text-rasma-dark border-border hover:bg-muted/50"
              }`}
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => setDate(getFirstOfMonth())}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition ${
                date === getFirstOfMonth()
                  ? "bg-rasma-dark text-rasma-lime border-rasma-dark"
                  : "bg-white text-rasma-dark border-border hover:bg-muted/50"
              }`}
            >
              Inicio de mes
            </button>
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
          {/* Styled file upload zone */}
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

            {/* Show existing receipt in edit mode */}
            {hasExistingReceipt && !receiptFile && (
              <div className="flex items-center gap-3 border rounded-lg p-3 bg-blue-50 border-blue-200">
                <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {expense.receiptFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Comprobante existente
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {expense.receiptViewLink && (
                    <a
                      href={expense.receiptViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md hover:bg-muted/50 text-blue-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 text-xs font-medium rounded-md bg-white border hover:bg-muted/50"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveReceipt(true)}
                    className="p-1 rounded-md hover:bg-red-50 text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* New file selected */}
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
              !hasExistingReceipt && (
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
              )
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              name="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rasma-teal/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error + Submit */}
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
        {pending
          ? isEdit
            ? "Guardando..."
            : "Registrando..."
          : isEdit
            ? "Guardar Cambios"
            : "Registrar Gasto"}
      </button>
    </form>
  );
}
