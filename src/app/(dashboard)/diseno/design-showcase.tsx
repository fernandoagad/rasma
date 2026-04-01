"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  X,
  Calendar,
  User,
  Heart,
  Shield,
  Eye,
  Palette,
  Type,
  Square,
  MousePointerClick,
  LayoutGrid,
  AlertTriangle,
  FileText,
  CreditCard,
  Users,
  Video,
  MapPin,
  Clock,
  Search,
  Plus,
  Loader2,
  Inbox,
  ArrowRight,
  MoreVertical,
  CheckCircle,
  XCircle,
  Repeat,
  List,
  MessageSquare,
  Hourglass,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════ */

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="mb-10 relative">
      <span className="text-[80px] font-black text-rasma-dark/[0.04] absolute -left-2 -top-10 select-none leading-none tracking-tighter">
        {number}
      </span>
      <div className="relative">
        <p className="text-xs font-bold text-rasma-teal uppercase tracking-[0.25em] mb-2">{`${number} —`}</p>
        <h2 className="text-3xl font-bold text-rasma-dark tracking-tight">{title}</h2>
        <p className="text-base text-muted-foreground mt-2 max-w-xl">{subtitle}</p>
      </div>
      <div className="mt-6 h-px bg-gradient-to-r from-rasma-dark/20 via-rasma-dark/5 to-transparent" />
    </div>
  );
}

function DoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
      <div className="flex items-center gap-2 mb-3 ml-2">
        <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
          <Check className="h-4 w-4" strokeWidth={3} />
        </div>
        <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-[0.15em]">Asi si</span>
      </div>
      <div className="ml-2">{children}</div>
    </div>
  );
}

function DontBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
      <div className="flex items-center gap-2 mb-3 ml-2">
        <div className="h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
          <X className="h-4 w-4" strokeWidth={3} />
        </div>
        <span className="text-xs font-extrabold text-red-700 uppercase tracking-[0.15em]">Asi no</span>
      </div>
      <div className="ml-2">{children}</div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl bg-rasma-dark text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(224,255,130,0.08),transparent_50%)]" />
      <div className="relative h-8 w-8 rounded-lg bg-rasma-lime/20 flex items-center justify-center shrink-0">
        <Shield className="h-4 w-4 text-rasma-lime" />
      </div>
      <div className="relative">
        <p className="text-[10px] font-bold text-rasma-lime/60 uppercase tracking-[0.2em] mb-1">Regla</p>
        <p className="text-sm font-medium leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function ColorSwatch({ name, hex, usage, className }: { name: string; hex: string; usage: string; className: string }) {
  return (
    <div className="group rounded-2xl overflow-hidden border border-border hover:shadow-md transition-shadow">
      <div className={cn("h-20 w-full transition-transform group-hover:scale-[1.02]", className)} />
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-rasma-dark">{name}</p>
          <p className="text-[10px] font-mono text-muted-foreground bg-zinc-100 px-1.5 py-0.5 rounded">{hex}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{usage}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SIDEBAR NAV
   ═══════════════════════════════════════════════ */

const NAV_ITEMS = [
  { id: "proposito", label: "Proposito", icon: Heart },
  { id: "colores", label: "Colores", icon: Palette },
  { id: "tipografia", label: "Tipografia", icon: Type },
  { id: "botones", label: "Botones", icon: MousePointerClick },
  { id: "tarjetas", label: "Tarjetas", icon: Square },
  { id: "listas", label: "Listas", icon: List },
  { id: "estados", label: "Estados", icon: AlertTriangle },
  { id: "formularios", label: "Formularios", icon: FileText },
  { id: "feedback", label: "Feedback", icon: Hourglass },
  { id: "dialogos", label: "Dialogos", icon: MessageSquare },
  { id: "layout", label: "Composicion", icon: LayoutGrid },
  { id: "accesibilidad", label: "Accesibilidad", icon: Eye },
];

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export function DesignShowcase() {
  const [activeSection, setActiveSection] = useState("proposito");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* ═══ HERO ═══ */}
      <div className="relative mb-16 rounded-3xl bg-rasma-dark p-8 sm:p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,197,250,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(224,255,130,0.08),transparent_50%)]" />
        <div className="absolute top-6 right-8 flex gap-1.5 opacity-30">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-rasma-lime" style={{ opacity: 1 - i * 0.2 }} />
          ))}
        </div>

        <div className="relative">
          <p className="text-xs font-bold text-rasma-teal/80 uppercase tracking-[0.3em] mb-4">
            Manual de diseno
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            Fundacion<br />
            <span className="text-rasma-lime">Rasma</span>
          </h1>
          <p className="text-base text-white/60 mt-5 max-w-lg leading-relaxed">
            Como se ve, como se siente y como se usa nuestra plataforma.
            Si un terapeuta puede entenderlo despues de 8 horas de trabajo,
            esta bien hecho.
          </p>
          <div className="flex items-center gap-6 mt-8 text-xs text-white/40">
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-rasma-lime" /> 12 secciones</span>
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-rasma-teal" /> Componentes reales</span>
            <span className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-white/30" /> Ejemplos concretos</span>
          </div>
        </div>
      </div>

      <div className="flex gap-10">
        {/* ═══ STICKY SIDEBAR ═══ */}
        <nav className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 px-3">Secciones</p>
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                  activeSection === item.id
                    ? "bg-rasma-dark text-rasma-lime shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-zinc-100"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-transform", activeSection === item.id && "scale-110")} />
                {item.label}
                {activeSection === item.id && (
                  <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
                )}
              </a>
            ))}
          </div>
        </nav>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="flex-1 min-w-0 space-y-24 pb-40">

          {/* ══════════════════════════════
              01 — PROPOSITO
          ══════════════════════════════ */}
          <SectionAnchor id="proposito">
            <SectionTitle number="01" title="Proposito" subtitle="Por que nuestra interfaz se ve asi. Tres principios que guian todo." />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { icon: Shield, title: "Confianza", desc: "Colores sobrios y consistencia visual. Nada de sorpresas. Todo donde se espera." },
                { icon: Heart, title: "Calma", desc: "Mucho espacio, poco ruido. Nadie necesita stress adicional al usar un software." },
                { icon: Eye, title: "Claridad", desc: "Un boton hace una cosa. Un color significa una cosa. Sin ambiguedad." },
              ].map((p) => (
                <div key={p.title} className="group relative rounded-2xl border-2 border-rasma-dark/10 p-6 hover:border-rasma-dark/30 transition-colors">
                  <div className="h-12 w-12 rounded-2xl bg-rasma-dark text-rasma-lime flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-rasma-dark">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <Rule>
              Cada decision visual responde a una pregunta: &quot;Si un terapeuta usa esto despues de 8 horas de sesiones, lo entiende al instante?&quot;
              Si la respuesta es no, hay que simplificar.
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              02 — COLORES
          ══════════════════════════════ */}
          <SectionAnchor id="colores">
            <SectionTitle number="02" title="Colores" subtitle="Solo usamos estos colores. No inventar nuevos. Nunca." />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <ColorSwatch name="Rasma Dark" hex="#1f2223" usage="Color principal. Botones importantes, sidebar, textos." className="bg-rasma-dark" />
              <ColorSwatch name="Rasma Lime" hex="#e0ff82" usage="Acento sobre fondo oscuro. Iconos activos, highlights." className="bg-rasma-lime" />
              <ColorSwatch name="Rasma Teal" hex="#25c5fa" usage="Links, focus rings, indicadores de info." className="bg-rasma-teal" />
              <ColorSwatch name="Rasma Green" hex="#37955b" usage="Exito y confirmaciones en graficos." className="bg-rasma-green" />
              <ColorSwatch name="Rasma Red" hex="#ee4444" usage="SOLO errores y cancelaciones. Nunca decorativo." className="bg-rasma-red" />
              <ColorSwatch name="Grises" hex="#f4f4f5 — #3f3f46" usage="Fondos, bordes, texto secundario. La base neutral." className="bg-zinc-300" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DoBlock>
                <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"><Plus className="h-4 w-4" /> Nueva Cita</Button>
                <p className="text-xs text-emerald-700 mt-3">Fondo oscuro + texto lime = boton principal</p>
              </DoBlock>
              <DontBlock>
                <button className="px-4 py-2 rounded-md text-sm font-medium bg-purple-600 text-white">Nueva Cita</button>
                <p className="text-xs text-red-700 mt-3">Morado, naranja, rosado = NO existen en la paleta</p>
              </DontBlock>
            </div>

            <Rule>
              El rojo es SOLO para cosas irreversibles: cancelar, eliminar, errores graves.
              Para llamar la atencion, usa fondo oscuro con lime.
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              03 — TIPOGRAFIA
          ══════════════════════════════ */}
          <SectionAnchor id="tipografia">
            <SectionTitle number="03" title="Tipografia" subtitle="Usamos Inter para todo. Una sola fuente. Multiples pesos." />

            <div className="rounded-2xl border overflow-hidden mb-6">
              {[
                { text: "Titulo de pagina", spec: "text-3xl / bold", el: "h1" as const, cls: "text-3xl font-bold text-rasma-dark tracking-tight" },
                { text: "Titulo de seccion", spec: "text-2xl / bold", el: "h2" as const, cls: "text-2xl font-bold text-rasma-dark" },
                { text: "Titulo de tarjeta", spec: "text-base / bold", el: "h3" as const, cls: "text-base font-bold text-rasma-dark" },
                { text: "Texto de la interfaz", spec: "text-sm / normal", el: "p" as const, cls: "text-sm text-foreground" },
                { text: "Texto secundario", spec: "text-sm / muted", el: "p" as const, cls: "text-sm text-muted-foreground" },
                { text: "ETIQUETA", spec: "text-xs / uppercase", el: "p" as const, cls: "text-xs text-muted-foreground uppercase tracking-wider font-semibold" },
                { text: "10:00 — #A1B2C3", spec: "text-xs / mono", el: "p" as const, cls: "text-xs font-mono text-muted-foreground" },
              ].map((row, i) => (
                <div key={i} className={cn("flex items-baseline justify-between px-6 py-5", i < 6 && "border-b")}>
                  <row.el className={row.cls}>{row.text}</row.el>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-4 bg-zinc-100 px-2 py-0.5 rounded">{row.spec}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DoBlock>
                <p className="text-sm font-medium text-rasma-dark">Agendar nueva cita</p>
                <p className="text-xs text-emerald-700 mt-2">Primera letra mayuscula, el resto en minuscula</p>
              </DoBlock>
              <DontBlock>
                <p className="text-sm font-medium text-rasma-dark">AGENDAR NUEVA CITA</p>
                <p className="text-xs text-red-700 mt-2">No todo en mayusculas (excepto etiquetas pequenas)</p>
              </DontBlock>
            </div>
          </SectionAnchor>

          {/* ══════════════════════════════
              04 — BOTONES
          ══════════════════════════════ */}
          <SectionAnchor id="botones">
            <SectionTitle number="04" title="Botones" subtitle="Cada boton tiene un proposito. Uno principal por pantalla. No mas." />

            <div className="space-y-4 mb-8">
              {[
                {
                  name: "Accion principal",
                  desc: "La accion MAS importante. Solo UNO por pantalla.",
                  buttons: (
                    <>
                      <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90"><Plus className="h-4 w-4" /> Crear</Button>
                      <Button className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90" disabled><Loader2 className="h-4 w-4 animate-spin" /> Creando...</Button>
                    </>
                  ),
                },
                {
                  name: "Accion secundaria",
                  desc: "Complementa al principal. Cancelar, volver, ver mas.",
                  buttons: (
                    <>
                      <Button variant="outline">Cancelar</Button>
                      <Button variant="outline"><Eye className="h-4 w-4" /> Ver detalle</Button>
                    </>
                  ),
                },
                {
                  name: "Accion discreta",
                  desc: "Dentro de tablas, listas o menus. Minimo ruido.",
                  buttons: (
                    <>
                      <Button variant="ghost" size="sm">Editar</Button>
                      <Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </>
                  ),
                },
                {
                  name: "Accion destructiva",
                  desc: "Cancelar citas, eliminar. SIEMPRE pedir confirmacion.",
                  buttons: <Button variant="destructive"><XCircle className="h-4 w-4" /> Cancelar cita</Button>,
                },
              ].map((tier) => (
                <div key={tier.name} className="flex items-center justify-between gap-4 p-5 rounded-2xl border hover:bg-zinc-50/50 transition-colors flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-bold text-rasma-dark">{tier.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tier.desc}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">{tier.buttons}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DoBlock>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Cancelar</Button>
                  <Button className="flex-1 bg-rasma-dark text-rasma-lime">Guardar</Button>
                </div>
                <p className="text-xs text-emerald-700 mt-3">Maximo 2 juntos. El principal a la derecha.</p>
              </DoBlock>
              <DontBlock>
                <div className="flex gap-1.5">
                  <Button className="bg-rasma-dark text-rasma-lime text-xs px-2">Guardar</Button>
                  <Button variant="outline" className="text-xs px-2">Cancelar</Button>
                  <Button variant="outline" className="text-xs px-2">Previa</Button>
                  <Button variant="outline" className="text-xs px-2">Borrador</Button>
                </div>
                <p className="text-xs text-red-700 mt-3">4 botones = paralisis. Nadie sabe que hacer.</p>
              </DontBlock>
            </div>

            <Rule>
              Un boton principal por pantalla. Si hay mas de 2 acciones, usa un menu desplegable (tres puntitos).
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              05 — TARJETAS
          ══════════════════════════════ */}
          <SectionAnchor id="tarjetas">
            <SectionTitle number="05" title="Tarjetas" subtitle="Toda la informacion vive dentro de tarjetas. Son el bloque basico." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Proxima cita</p>
                  <div className="flex items-center gap-3">
                    <AvatarInitials name="Maria Lopez" size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Maria Lopez</p>
                      <p className="text-xs text-muted-foreground">Hoy, 10:00 — Individual — 50 min</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="bg-rasma-dark text-rasma-lime hover:bg-rasma-dark/90 gap-1.5"><Video className="h-3.5 w-3.5" /> Unirse</Button>
                    <Button size="sm" variant="outline" className="gap-1.5">Ver detalle <ArrowRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-zinc-100 text-rasma-dark shrink-0"><Calendar className="h-5 w-5" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Fecha</p>
                      <p className="text-sm font-semibold capitalize mt-0.5">Lunes, 31 de marzo 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border mt-2">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-zinc-100 text-rasma-dark shrink-0"><Clock className="h-5 w-5" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Horario</p>
                      <p className="text-sm font-semibold mt-0.5">10:00 – 10:50 <span className="text-muted-foreground font-normal">(50 min)</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DoBlock>
                <Card className="shadow-none"><CardContent className="py-3 px-4"><p className="text-sm">Espaciado generoso, bordes suaves</p></CardContent></Card>
                <p className="text-xs text-emerald-700 mt-3">Padding consistente. Sin sombras fuertes.</p>
              </DoBlock>
              <DontBlock>
                <div className="border-4 border-black p-1 rounded shadow-2xl bg-yellow-50"><p className="text-sm">Apretado y ruidoso</p></div>
                <p className="text-xs text-red-700 mt-3">Bordes gruesos, sombras pesadas, colores random.</p>
              </DontBlock>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Estado vacio</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">Cuando no hay datos, SIEMPRE mostrar un mensaje amigable. Nunca dejar en blanco.</p>
                <EmptyState icon={Inbox} title="No hay citas registradas" description="Cree una nueva cita para comenzar."
                  action={<Button size="sm" className="bg-rasma-dark text-rasma-lime"><Plus className="h-4 w-4" /> Nueva Cita</Button>} />
              </CardContent>
            </Card>
          </SectionAnchor>

          {/* ══════════════════════════════
              06 — LISTAS
          ══════════════════════════════ */}
          <SectionAnchor id="listas">
            <SectionTitle number="06" title="Listas con acciones" subtitle="La mayoria de las pantallas son listas de citas, pacientes o pagos. Asi se construyen." />

            {/* Anatomy */}
            <Card className="mb-6">
              <CardContent className="pt-5">
                <p className="text-sm font-bold text-rasma-dark mb-4">Anatomia de un item</p>
                <div className="rounded-2xl border overflow-hidden shadow-sm">
                  <div className="flex items-stretch">
                    <div className="flex flex-col items-center justify-center w-[100px] shrink-0 border-r py-3 bg-zinc-50">
                      <p className="text-base font-bold text-rasma-dark leading-none">10:00</p>
                      <p className="text-xs text-muted-foreground mt-1">10:50</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">50 min</p>
                    </div>
                    <div className="flex-1 flex items-center justify-between px-4 py-3.5 min-w-0 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarInitials name="Maria Lopez" size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">Maria Lopez</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">Individual</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">Dra. Torres</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="inline-flex items-center gap-1 text-xs text-rasma-teal font-medium"><Repeat className="h-3 w-3" />Recurrente</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /><span className="hidden sm:inline">Presencial</span></span>
                        <StatusBadge type="appointment" status="programada" />
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-rasma-teal/30 border border-rasma-teal" />Franja horaria</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-rasma-dark/10 border border-rasma-dark/30" />Paciente + datos</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-zinc-200 border border-zinc-300" />Modalidad + estado</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-rasma-lime/30 border border-rasma-lime" />Menu de acciones</span>
                </div>
              </CardContent>
            </Card>

            {/* Context menus */}
            <Card className="mb-6">
              <CardContent className="pt-5">
                <p className="text-sm font-bold text-rasma-dark mb-2">Menu de acciones (tres puntitos)</p>
                <p className="text-xs text-muted-foreground mb-4">Las opciones cambian segun el estado. Solo se muestran acciones que tienen sentido.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center gap-2 mb-3"><StatusBadge type="appointment" status="programada" /><span className="text-xs text-muted-foreground font-medium">Muestra:</span></div>
                    <div className="space-y-0.5 text-sm">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"><Eye className="h-4 w-4 text-muted-foreground" /> Ver detalle</div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"><FileText className="h-4 w-4 text-muted-foreground" /> Editar cita</div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"><User className="h-4 w-4 text-muted-foreground" /> Ver paciente</div>
                      <div className="h-px bg-border my-1" />
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-rasma-dark font-medium"><CheckCircle className="h-4 w-4" /> Completada</div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-500"><AlertTriangle className="h-4 w-4" /> No asistio</div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-rasma-red font-medium"><XCircle className="h-4 w-4" /> Cancelar</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <div className="flex items-center gap-2 mb-3"><StatusBadge type="appointment" status="completada" /><span className="text-xs text-muted-foreground font-medium">Muestra:</span></div>
                    <div className="space-y-0.5 text-sm">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"><Eye className="h-4 w-4 text-muted-foreground" /> Ver detalle</div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"><User className="h-4 w-4 text-muted-foreground" /> Ver paciente</div>
                      <div className="h-px bg-border my-1" />
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"><FileText className="h-4 w-4 text-muted-foreground" /> Agregar nota</div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"><CreditCard className="h-4 w-4 text-muted-foreground" /> Registrar pago</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recurring */}
            <Card className="mb-6">
              <CardContent className="pt-5">
                <p className="text-sm font-bold text-rasma-dark mb-2">Barra de progreso recurrente</p>
                <p className="text-xs text-muted-foreground mb-4">Cuando una cita es parte de una serie semanal.</p>
                <div className="rounded-2xl border bg-zinc-50/50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Repeat className="h-4 w-4 text-rasma-dark" />
                    <p className="text-sm font-semibold text-rasma-dark">Serie recurrente (8 citas)</p>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-zinc-200 mb-2">
                    <div className="bg-emerald-500" style={{ width: "37.5%" }} />
                    <div className="bg-blue-400" style={{ width: "37.5%" }} />
                    <div className="bg-amber-400" style={{ width: "12.5%" }} />
                    <div className="bg-red-300" style={{ width: "12.5%" }} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />3 completadas</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" />3 programadas</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />1 no asistio</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-300" />1 cancelada</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Rule>
              Las acciones del menu cambian segun el estado. Nunca mostrar opciones que no aplican.
              &quot;Editar&quot; solo aparece si la cita esta programada. &quot;Agregar nota&quot; solo si esta completada.
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              07 — ESTADOS
          ══════════════════════════════ */}
          <SectionAnchor id="estados">
            <SectionTitle number="07" title="Estados y badges" subtitle="Cada estado tiene un color fijo. Siempre el mismo. Sin excepciones." />

            {[
              { icon: Calendar, label: "Citas", items: [
                { status: "programada", type: "appointment" as const, desc: "Pendiente" },
                { status: "completada", type: "appointment" as const, desc: "Ya se hizo" },
                { status: "cancelada", type: "appointment" as const, desc: "Se cancelo" },
                { status: "no_asistio", type: "appointment" as const, desc: "No vino" },
              ]},
              { icon: User, label: "Pacientes", items: [
                { status: "activo", type: "patient" as const, desc: "En tratamiento" },
                { status: "inactivo", type: "patient" as const, desc: "Pausado" },
                { status: "alta", type: "patient" as const, desc: "Termino" },
              ]},
              { icon: CreditCard, label: "Pagos", items: [
                { status: "pendiente", type: "payment" as const, desc: "Falta pagar" },
                { status: "pagado", type: "payment" as const, desc: "Listo" },
                { status: "parcial", type: "payment" as const, desc: "Incompleto" },
                { status: "cancelado", type: "payment" as const, desc: "Anulado" },
              ]},
              { icon: Users, label: "Roles", items: [
                { status: "admin", type: "role" as const, desc: "Ve y hace todo" },
                { status: "terapeuta", type: "role" as const, desc: "Sus pacientes" },
                { status: "recepcionista", type: "role" as const, desc: "Agenda y pagos" },
                { status: "supervisor", type: "role" as const, desc: "Supervision" },
              ]},
            ].map((group) => (
              <Card key={group.label} className="mb-4">
                <CardContent className="pt-5">
                  <p className="text-sm font-bold text-rasma-dark mb-4 flex items-center gap-2"><group.icon className="h-4 w-4" />{group.label}</p>
                  <div className="flex flex-wrap gap-3">
                    {group.items.map((item) => (
                      <div key={item.status} className="flex items-center gap-2 p-3 rounded-xl border bg-zinc-50/50">
                        <StatusBadge type={item.type} status={item.status} />
                        <span className="text-xs text-muted-foreground">— {item.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Rule>
              Los badges nunca cambian de color. &quot;Completada&quot; es SIEMPRE oscuro. &quot;Cancelada&quot; es SIEMPRE rojo.
              Si inventas un nuevo estado, definelo aqui primero.
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              08 — FORMULARIOS
          ══════════════════════════════ */}
          <SectionAnchor id="formularios">
            <SectionTitle number="08" title="Formularios" subtitle="Tan faciles como llenar un papel. Nada de adivinar que poner." />

            <Card className="mb-6">
              <CardContent className="pt-6 space-y-6">
                <div className="max-w-sm">
                  <Label className="text-xs text-muted-foreground mb-1.5">Nombre del paciente</Label>
                  <Input placeholder="Ej: Maria Lopez" />
                  <p className="text-xs text-muted-foreground mt-1">Siempre incluir ejemplo en placeholder</p>
                </div>
                <Separator />
                <div className="max-w-sm">
                  <Label className="text-xs text-muted-foreground mb-1.5">Tipo de sesion</Label>
                  <Select defaultValue="individual">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="pareja">Pareja</SelectItem>
                      <SelectItem value="familiar">Familiar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="max-w-sm">
                  <Label className="text-xs text-muted-foreground mb-1.5">Notas (opcional)</Label>
                  <Textarea placeholder="Motivo de consulta, observaciones..." className="resize-none" rows={3} />
                </div>
                <Separator />
                <div className="flex items-center justify-between max-w-sm">
                  <div><p className="text-sm font-medium text-rasma-dark">Cita recurrente</p><p className="text-xs text-muted-foreground">Repetir semanalmente</p></div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Checkbox id="confirm-demo" />
                  <Label htmlFor="confirm-demo" className="text-sm">Confirmo que los datos son correctos</Label>
                </div>
                <Separator />
                <div className="max-w-sm">
                  <Label className="text-xs text-muted-foreground mb-1.5">Precio en CLP</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input type="number" placeholder="35000" className="pl-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DoBlock>
                <Label className="text-xs text-muted-foreground">Precio en CLP</Label>
                <div className="relative max-w-[200px] mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input type="number" placeholder="35000" className="pl-7" />
                </div>
                <p className="text-xs text-emerald-700 mt-3">Etiqueta arriba + placeholder con ejemplo + formato claro</p>
              </DoBlock>
              <DontBlock>
                <Input placeholder="Ingrese el precio del paciente en pesos chilenos sin puntos ni comas" className="mt-1" />
                <p className="text-xs text-red-700 mt-3">Sin etiqueta, placeholder larguisimo, instrucciones confusas</p>
              </DontBlock>
            </div>

            <Rule>
              Cada campo tiene 3 cosas: etiqueta arriba (que es), placeholder (ejemplo), y texto de ayuda si hace falta.
              Campos opcionales deben decir &quot;(opcional)&quot;.
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              09 — FEEDBACK
          ══════════════════════════════ */}
          <SectionAnchor id="feedback">
            <SectionTitle number="09" title="Feedback y carga" subtitle="Siempre decirle al usuario que esta pasando. Nunca dejarlo esperando sin saber." />

            <Card className="mb-6">
              <CardContent className="pt-5 space-y-6">
                <div>
                  <p className="text-sm font-bold text-rasma-dark mb-3">Botones durante carga</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-center">
                      <Button className="bg-rasma-dark text-rasma-lime"><Plus className="h-4 w-4" /> Crear Cita</Button>
                      <p className="text-[10px] text-muted-foreground mt-2">Normal</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="text-center">
                      <Button className="bg-rasma-dark text-rasma-lime" disabled><Loader2 className="h-4 w-4 animate-spin" /> Creando...</Button>
                      <p className="text-[10px] text-muted-foreground mt-2">Procesando</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="text-center">
                      <Button className="bg-emerald-600 text-white"><Check className="h-4 w-4" /> Creada</Button>
                      <p className="text-[10px] text-muted-foreground mt-2">Exito</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-bold text-rasma-dark mb-3">Tarjetas durante accion</p>
                  <div className="flex gap-4">
                    <div className="flex-1 rounded-xl border p-3 flex items-center gap-3">
                      <AvatarInitials name="Ana Torres" size="sm" />
                      <p className="text-sm font-medium flex-1">Ana Torres</p>
                      <StatusBadge type="appointment" status="programada" />
                    </div>
                    <div className="flex-1 rounded-xl border p-3 flex items-center gap-3 opacity-50 pointer-events-none">
                      <AvatarInitials name="Carlos Ruiz" size="sm" />
                      <p className="text-sm font-medium flex-1">Carlos Ruiz</p>
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-1.5">
                    <p className="flex-1 text-[10px] text-muted-foreground text-center">Normal</p>
                    <p className="flex-1 text-[10px] text-muted-foreground text-center">Procesando (opacity-50)</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-bold text-rasma-dark mb-3">Toasts de notificacion</p>
                  <p className="text-xs text-muted-foreground mb-3">Aparecen abajo a la derecha. Desaparecen solos. No requieren accion.</p>
                  <div className="space-y-2 max-w-sm">
                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-white shadow-lg"><CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" /><p className="text-sm">Cita creada correctamente</p></div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-white shadow-lg"><AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" /><p className="text-sm">No se pudo generar link de Meet</p></div>
                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-white shadow-lg"><XCircle className="h-5 w-5 text-red-500 shrink-0" /><p className="text-sm">Error al guardar. Intente nuevamente.</p></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Rule>
              Toda accion que toma mas de 300ms debe mostrar feedback visual.
              El usuario NUNCA debe quedarse mirando la pantalla sin saber si algo paso.
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              10 — DIALOGOS
          ══════════════════════════════ */}
          <SectionAnchor id="dialogos">
            <SectionTitle number="10" title="Dialogos y confirmaciones" subtitle="Antes de hacer algo irreversible, SIEMPRE preguntar. Pero bien." />

            <Card className="mb-6">
              <CardContent className="pt-5">
                <p className="text-sm font-bold text-rasma-dark mb-4">Anatomia del dialogo</p>
                <div className="max-w-md mx-auto rounded-2xl border-2 border-zinc-200 bg-white p-8 shadow-2xl">
                  <h3 className="text-lg font-bold text-rasma-dark">Cancelar esta cita?</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Se notificara al paciente y esta accion no se puede deshacer.
                  </p>
                  <div className="flex gap-3 mt-8">
                    <Button variant="outline" className="flex-1 h-11">No, volver</Button>
                    <Button variant="destructive" className="flex-1 h-11"><XCircle className="h-4 w-4" /> Si, cancelar</Button>
                  </div>
                </div>
                <div className="mt-6 space-y-1 text-xs text-muted-foreground max-w-md mx-auto">
                  <p><strong className="text-rasma-dark">Titulo:</strong> Pregunta directa, sin rodeos</p>
                  <p><strong className="text-rasma-dark">Descripcion:</strong> Que va a pasar exactamente</p>
                  <p><strong className="text-rasma-dark">Izquierda:</strong> Escapar (siempre outline)</p>
                  <p><strong className="text-rasma-dark">Derecha:</strong> Confirmar (rojo si destructiva)</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DoBlock>
                <p className="text-sm font-medium text-rasma-dark">&quot;Se cancelaran 5 citas futuras programadas. Continuar?&quot;</p>
                <p className="text-xs text-emerald-700 mt-2">Especifico: dice cuantas y cuales</p>
              </DoBlock>
              <DontBlock>
                <p className="text-sm font-medium text-rasma-dark">&quot;Esta seguro?&quot;</p>
                <p className="text-xs text-red-700 mt-2">Seguro de que? No dice que va a pasar.</p>
              </DontBlock>
            </div>

            <Rule>
              El dialogo dice: QUE va a pasar, A QUIEN afecta, y SI SE PUEDE deshacer.
              El boton de escape dice &quot;No, volver&quot; — nunca solo &quot;Cancelar&quot; (se confunde con la accion).
            </Rule>
          </SectionAnchor>

          {/* ══════════════════════════════
              11 — COMPOSICION
          ══════════════════════════════ */}
          <SectionAnchor id="layout">
            <SectionTitle number="11" title="Composicion" subtitle="Como organizar los elementos en una pagina." />

            <Card className="mb-6">
              <CardContent className="pt-5">
                <p className="text-sm font-bold text-rasma-dark mb-4">Estructura de pagina tipica</p>
                <div className="rounded-2xl border-2 border-dashed border-zinc-300 p-5 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100">
                    <div>
                      <div className="h-5 w-32 bg-rasma-dark rounded" />
                      <div className="h-3 w-48 bg-zinc-300 rounded mt-1.5" />
                    </div>
                    <div className="h-8 w-24 bg-rasma-dark rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-rasma-lime font-bold">+ Nuevo</span>
                    </div>
                  </div>
                  <div className="flex gap-2 p-2">
                    <div className="h-7 w-20 bg-zinc-200 rounded-lg" />
                    <div className="h-7 w-20 bg-zinc-200 rounded-lg" />
                    <div className="h-7 w-20 bg-zinc-200 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-xl border bg-white p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-200" />
                        <div className="flex-1"><div className="h-3 w-28 bg-zinc-200 rounded" /><div className="h-2 w-40 bg-zinc-100 rounded mt-1.5" /></div>
                        <div className="h-5 w-16 bg-zinc-200 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p><strong className="text-rasma-dark">1. Cabecera:</strong> Titulo + subtitulo + boton principal</p>
                  <p><strong className="text-rasma-dark">2. Filtros:</strong> Opciones para acotar la lista (opcional)</p>
                  <p><strong className="text-rasma-dark">3. Contenido:</strong> Lista de items o grilla de tarjetas</p>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="pt-5">
                <p className="text-sm font-bold text-rasma-dark mb-4">Espaciado</p>
                <div className="flex items-end gap-5 pb-4">
                  {[
                    { size: "4px", label: "Minimo", h: "h-4" },
                    { size: "8px", label: "Interno", h: "h-8" },
                    { size: "16px", label: "Elementos", h: "h-16" },
                    { size: "24px", label: "Secciones", h: "h-24" },
                    { size: "40px", label: "Bloques", h: "h-32" },
                  ].map((s) => (
                    <div key={s.size} className="flex flex-col items-center gap-2">
                      <div className={cn("w-12 bg-rasma-teal/15 border-2 border-dashed border-rasma-teal/40 rounded-lg", s.h)} />
                      <span className="text-[10px] font-mono text-muted-foreground">{s.size}</span>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{s.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <p className="text-sm font-bold text-rasma-dark mb-4">Avatares e indicadores</p>
                <div className="flex items-end gap-6">
                  {[
                    { name: "Maria Lopez", size: "lg" as const, label: "Grande" },
                    { name: "Carlos Ruiz", size: "md" as const, label: "Mediano" },
                    { name: "Ana Torres", size: "sm" as const, label: "Pequeno" },
                  ].map((a) => (
                    <div key={a.name} className="text-center">
                      <AvatarInitials name={a.name} size={a.size} />
                      <p className="text-[10px] text-muted-foreground mt-1.5">{a.label}</p>
                    </div>
                  ))}
                  <div className="h-px flex-1 bg-border" />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg border"><Video className="h-4 w-4 text-rasma-dark" /><span className="text-xs">Online</span></div>
                    <div className="flex items-center gap-2 p-2 rounded-lg border"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-xs">Presencial</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SectionAnchor>

          {/* ══════════════════════════════
              12 — ACCESIBILIDAD
          ══════════════════════════════ */}
          <SectionAnchor id="accesibilidad">
            <SectionTitle number="12" title="Accesibilidad" subtitle="Todos deben poder usar la plataforma. Sin excepciones." />

            <div className="space-y-3 mb-6">
              {[
                { title: "Tamano minimo de botones: 44x44 px", desc: "Los dedos son grandes. Los botones tambien." },
                { title: "Contraste de texto: 4.5:1 minimo", desc: "Texto gris claro sobre blanco se lee mal. Usar al menos #52525b sobre blanco." },
                { title: "No depender solo del color", desc: "Siempre texto o icono ademas del color. El badge dice 'Cancelada', no solo es rojo." },
                { title: "Confirmar antes de destruir", desc: "Cancelar, eliminar, borrar: SIEMPRE dialogo de confirmacion explicito." },
                { title: "Navegacion por teclado", desc: "Tab avanza, Enter confirma, Escape cierra. Todo interactivo tiene focus visible." },
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border hover:bg-zinc-50/50 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-rasma-dark text-rasma-lime flex items-center justify-center shrink-0 text-sm font-bold">{i + 1}</div>
                  <div>
                    <p className="text-sm font-bold text-rasma-dark">{rule.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DoBlock>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Cancelada</Badge>
                  <span className="text-xs text-emerald-700">Color + texto descriptivo</span>
                </div>
              </DoBlock>
              <DontBlock>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-red-500" />
                  <span className="text-xs text-red-700">Solo un circulo rojo — que significa?</span>
                </div>
              </DontBlock>
            </div>

            <Rule>
              Si tu abuela no puede usarlo, esta mal hecho. Disena para el caso mas dificil y todos se benefician.
            </Rule>
          </SectionAnchor>

        </div>
      </div>
    </div>
  );
}
