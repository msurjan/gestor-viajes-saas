import Link from 'next/link'
import {
  Globe, Search, CalendarDays, Newspaper, Zap, Target,
  ArrowRight, BarChart3, TrendingUp, CheckCircle2,
  ChevronRight, MapPin, Tag,
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '150+', label: 'Eventos curados',         sub: 'en catálogo global activo' },
  { value: '40+',  label: 'Países cubiertos',         sub: 'en 6 continentes' },
  { value: '10',   label: 'Industrias estratégicas',  sub: 'desde minería hasta ESG' },
  { value: '5',    label: 'Ángulos de búsqueda IA',   sub: 'por consulta Perplexity' },
]

const FEATURES = [
  {
    Icon: Search,
    accent: 'indigo',
    title: 'Motor IA Multi-Ángulo',
    body: 'Perplexity busca en 5 dimensiones distintas — global, LATAM, Europa/Asia, nichos especializados y eventos 2027+. Cada búsqueda genera resultados únicos con lista de exclusión automática para eliminar repeticiones.',
  },
  {
    Icon: CalendarDays,
    accent: 'blue',
    title: 'Agenda Corporativa',
    body: 'Clasifica cada evento: Evaluando, Confirmado Asistente o Confirmado Sponsor. Vista calendario mensual, anual, mapa global interactivo o grilla de tarjetas — filtrable por industria, país y fecha.',
  },
  {
    Icon: Newspaper,
    accent: 'emerald',
    title: 'Radar de Prensa',
    body: 'Monitoreo automatizado de noticias para cada evento del catálogo. Tu equipo sabe exactamente qué dice el mercado antes de confirmar asistencia o desembolsar en patrocinio.',
  },
  {
    Icon: Globe,
    accent: 'violet',
    title: 'Catálogo Global Curado',
    body: 'Base de datos verificada de conferencias, cumbres y ferias B2B mundiales. Los eventos son descubiertos por IA y curados manualmente por el equipo Vento para garantizar relevancia real.',
  },
  {
    Icon: BarChart3,
    accent: 'amber',
    title: 'Inteligencia de Precios',
    body: 'La comunidad reporta costos reales de entrada, stand y patrocinio. Compara precios entre eventos similares para presupuestar con datos del mercado, no con estimaciones.',
  },
  {
    Icon: Target,
    accent: 'rose',
    title: 'Señales de Mercado',
    body: 'Sugiere temáticas emergentes, geografías inexploradas y nichos especializados. Envía propuestas de valor a tu equipo comercial antes de que tu competencia lo haga.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Define tu foco estratégico',
    body: 'Ingresa un tema — "minería en Sudamérica", "ESG Europe", "AI fintech" — y activa el motor de búsqueda multiángulo.',
  },
  {
    num: '02',
    title: 'La IA descubre desde 5 ángulos',
    body: 'Perplexity busca globalmente, regionalmente, en nichos y hacia 2027+. Sin repeticiones, con datos reales y fuente verificada.',
  },
  {
    num: '03',
    title: 'Tu equipo gestiona y decide',
    body: 'Confirma asistencia, monitorea prensa, compara costos y exporta a calendario corporativo. Todo desde un solo lugar.',
  },
]

const INDUSTRIES = [
  { emoji: '⛏️', label: 'Minería y Metales' },
  { emoji: '⚡', label: 'Energía y Renovables' },
  { emoji: '🤖', label: 'Tecnología e IA' },
  { emoji: '💰', label: 'Finanzas e Inversión' },
  { emoji: '🏗️', label: 'Infraestructura' },
  { emoji: '🌱', label: 'Sostenibilidad y ESG' },
  { emoji: '🛢️', label: 'Petróleo y Gas' },
  { emoji: '🚚', label: 'Logística' },
  { emoji: '🏭', label: 'Manufactura 4.0' },
  { emoji: '🌐', label: 'Otros Estratégicos' },
]

const MOCK_CARDS = [
  { nombre: 'PDAC 2027', ciudad: 'Toronto, Canada', tema: 'Minería y Metales', fecha: 'Mar 2027', estado: '★ Sponsor', estadoColor: 'bg-emerald-500 text-white' },
  { nombre: 'Energy Transition Summit', ciudad: 'London, UK', tema: 'Energía', fecha: 'Jun 2026', estado: '✓ Asistente', estadoColor: 'bg-blue-500 text-white' },
  { nombre: 'FinTech Latam Congress', ciudad: 'Ciudad de México, MX', tema: 'Finanzas e Inversión', fecha: 'Sep 2026', estado: 'Evaluando', estadoColor: 'bg-amber-400 text-white' },
]

const ACCENT: Record<string, { icon: string; ring: string; bg: string }> = {
  indigo: { icon: 'text-indigo-600', ring: 'ring-indigo-100', bg: 'bg-indigo-50' },
  blue:   { icon: 'text-blue-600',   ring: 'ring-blue-100',   bg: 'bg-blue-50'   },
  emerald:{ icon: 'text-emerald-600',ring: 'ring-emerald-100',bg: 'bg-emerald-50'},
  violet: { icon: 'text-violet-600', ring: 'ring-violet-100', bg: 'bg-violet-50' },
  amber:  { icon: 'text-amber-600',  ring: 'ring-amber-100',  bg: 'bg-amber-50'  },
  rose:   { icon: 'text-rose-600',   ring: 'ring-rose-100',   bg: 'bg-rose-50'   },
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white antialiased">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <Globe className="h-6 w-6 text-blue-600" strokeWidth={1.75} />
            <span className="font-bold text-[#0c1e3c] text-base tracking-tight">Vento Global</span>
            <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Intelligence Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Ver plataforma
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#0c1e3c] hover:bg-blue-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Iniciar sesión <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative bg-[#0c1e3c] min-h-screen flex items-center overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 items-center">

            {/* Left — Copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full mb-7">
                <Zap className="h-3.5 w-3.5" />
                Motor IA Perplexity · 2026
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-[3.5rem] font-bold text-white leading-[1.07] tracking-tight mb-6">
                La inteligencia global de eventos B2B que{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                  tu empresa necesita
                </span>
              </h1>

              <p className="text-lg text-blue-100/65 leading-relaxed mb-9 max-w-xl">
                Descubre, curate y gestiona conferencias, cumbres y ferias estratégicas en todo el mundo. Motor IA con 5 ángulos de búsqueda, agenda corporativa multiusuario y radar de prensa automatizado.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-xl shadow-blue-500/25"
                >
                  Solicitar acceso <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white/75 hover:text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors bg-white/5 hover:bg-white/10"
                >
                  Ver la plataforma <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                {['150+ eventos curados', '40+ países', '10 industrias B2B'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-sm text-blue-200/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-blue-200/80">{t}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right — Mock cards */}
            <div className="hidden xl:flex flex-col gap-4">
              {MOCK_CARDS.map((c, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-5 flex items-start gap-4"
                  style={{ transform: i === 1 ? 'translateX(24px)' : i === 2 ? 'translateX(12px)' : 'translateX(0)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.estadoColor}`}>
                        {c.estado}
                      </span>
                      <span className="text-[10px] font-medium text-blue-300/60 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Tag className="h-2.5 w-2.5" />{c.tema}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white leading-snug mb-1.5">{c.nombre}</p>
                    <div className="flex items-center gap-3 text-xs text-blue-200/50">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.ciudad}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{c.fecha}</span>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1 animate-pulse" />
                </div>
              ))}
              <p className="text-xs text-blue-200/30 text-right pr-1">Vista previa — datos reales de la plataforma</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Industries bar ─────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-5 overflow-x-auto">
        <div className="flex items-center gap-3 px-6 min-w-max mx-auto justify-center flex-wrap">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mr-2">Industrias</span>
          {INDUSTRIES.map(({ emoji, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap">
              <span>{emoji}</span> {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Problem / Solution ─────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-4">El problema real</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0c1e3c] leading-tight mb-6">
            Tu equipo pierde semanas buscando eventos relevantes<br className="hidden sm:block" /> en decenas de fuentes dispersas
          </h2>
          <p className="text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed mb-12">
            Buscar en Google, LinkedIn, bases de datos de industria, sitios de organizaciones internacionales... es lento, manual, costoso y siempre incompleto. Mientras tanto, los cupos de patrocinio se llenan.
          </p>
          <div className="inline-flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-8 py-5">
            <Zap className="h-6 w-6 text-indigo-600 flex-shrink-0" />
            <p className="text-base font-semibold text-indigo-900 text-left">
              Vento Global centraliza la inteligencia de eventos con IA, liberando a tu equipo para lo que realmente importa: las relaciones correctas.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">Plataforma completa</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0c1e3c]">Todo lo que necesita tu equipo de estrategia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ Icon, accent, title, body }) => {
              const a = ACCENT[accent]
              return (
                <div key={title} className={`rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow`}>
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ring-4 ${a.ring} ${a.bg} mb-4`}>
                    <Icon className={`h-5 w-5 ${a.icon}`} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-bold text-[#0c1e3c] mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">Flujo de trabajo</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0c1e3c]">Cómo funciona Vento Global</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, body }, i) => (
              <div key={num} className="relative text-center md:text-left">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%-1rem)] w-8 border-t-2 border-dashed border-slate-200 z-0" />
                )}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0c1e3c] text-white font-bold text-sm mb-4 relative z-10">
                  {num}
                </div>
                <h3 className="text-base font-bold text-[#0c1e3c] mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#0c1e3c]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(({ value, label, sub }) => (
              <div key={label} className="text-center">
                <p className="text-4xl sm:text-5xl font-bold text-white mb-1">{value}</p>
                <p className="text-sm font-semibold text-blue-300/80 mb-0.5">{label}</p>
                <p className="text-xs text-blue-200/40">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Para quién es ─────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">Audiencia objetivo</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0c1e3c]">Diseñado para quienes toman decisiones</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                role: 'Directivos y C-Suite',
                desc: 'CEOs, VPs y directores que necesitan visibilidad en el ecosistema global de su industria para identificar socios, competidores y oportunidades.',
              },
              {
                icon: Target,
                role: 'Equipos de Desarrollo de Negocio',
                desc: 'BizDev y comerciales que usan eventos como canal de prospección, networking y cierre de acuerdos estratégicos internacionales.',
              },
              {
                icon: Globe,
                role: 'Gestión de Viajes Corporativos',
                desc: 'Travel managers que necesitan planificar con anticipación: vuelos, hoteles y presupuestos alineados al calendario de eventos estratégicos del año.',
              },
            ].map(({ icon: Icon, role, desc }) => (
              <div key={role} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#0c1e3c] mb-4">
                  <Icon className="h-5 w-5 text-blue-400" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold text-[#0c1e3c] mb-2">{role}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-28 bg-gradient-to-br from-[#0c1e3c] to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300/60 mb-5">¿Tu empresa asiste a más de 5 eventos al año?</p>
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Vento Global te ahorra semanas de investigación — por evento
          </h2>
          <p className="text-lg text-blue-100/60 mb-10 max-w-xl mx-auto leading-relaxed">
            Centraliza la inteligencia, alinea al equipo y toma decisiones de asistencia y patrocinio con datos reales del mercado global.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-base px-9 py-4 rounded-xl transition-colors shadow-2xl shadow-blue-500/30"
            >
              Solicitar acceso a la plataforma <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-xs text-blue-200/30 mt-6">Sin tarjeta de crédito · Acceso curado por invitación</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-blue-400" strokeWidth={1.75} />
            <span className="font-bold text-white text-sm">Vento Global</span>
            <span className="text-slate-500 text-xs">· Intelligence Hub</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 Vento Global. Todos los derechos reservados.</p>
          <div className="flex items-center gap-5">
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">Plataforma</Link>
            <Link href="/login" className="text-xs text-slate-400 hover:text-white transition-colors">Iniciar sesión</Link>
            <Link href="/sugerir-evento" className="text-xs text-slate-400 hover:text-white transition-colors">Sugerir evento</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
