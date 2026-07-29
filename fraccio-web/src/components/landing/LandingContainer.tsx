import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  Bell,
  CheckCircle2,
  CreditCard,
  FileText,
  Home,
  MessageCircle,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/notifications'
import { submitContactRequestFn } from '@/lib/contact'
import { logger } from '@/utils/logger'

const features = [
  {
    icon: Home,
    title: 'Gestión de Propiedades',
    description:
      'Administra todas las casas y propiedades de tu fraccionamiento de manera centralizada.',
  },
  {
    icon: Users,
    title: 'Control de Residentes',
    description:
      'Invita colonos por correo y asigna dueños y residentes a cada casa con roles y permisos.',
  },
  {
    icon: Bell,
    title: 'Anuncios y Notificaciones',
    description:
      'Publica anuncios para tu comunidad y avisa a los colonos con notificaciones push en su navegador.',
  },
  // {
  //   icon: MessageCircle,
  //   title: 'Grupos de WhatsApp',
  //   description:
  //     'Conecta el WhatsApp del fraccionamiento y envía avisos al grupo de colonos desde la plataforma.',
  // },
  {
    icon: FileText,
    title: 'Gestión Documental',
    description:
      'Sube reglamentos, actas y estados de cuenta a la nube y compártelos con los colonos.',
  },
  {
    icon: CreditCard,
    title: 'Control de Pagos',
    description:
      'Cobra cuotas de mantenimiento con tarjeta en línea a través de Stripe y consulta el historial de pagos.',
  },
]

const benefits = [
  'Sistema multi-fraccionamiento desde una sola cuenta',
  'Invitaciones por correo con roles y permisos por colono',
  'Anuncios con notificaciones push en el navegador',
  'Pagos de cuotas en línea con Stripe',
  'Avisos al grupo de WhatsApp del fraccionamiento',
  'Acceso desde cualquier dispositivo',
]

export default function LandingContainer() {
  const router = useRouter()
  const { addToast } = useToast()
  const submitContactRequest = useServerFn(submitContactRequestFn)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    fraccionamiento: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await submitContactRequest({ data: formData })
      setIsSubmitted(true)
      setFormData({ name: '', email: '', phone: '', fraccionamiento: '' })

      // Vuelve a mostrar el formulario después de unos segundos
      setTimeout(() => setIsSubmitted(false), 5000)
    } catch (error) {
      logger('error', 'Error submitting contact request:', { error })
      addToast({
        type: 'error',
        description: 'No pudimos enviar tu solicitud. Intenta de nuevo.',
        duration: 10000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Home className="h-8 w-8 shrink-0 text-primary" />
              <span className="text-2xl font-bold text-primary">Fraccio</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  router.navigate({ to: '/login' })
                }}
              >
                Iniciar Sesión
              </Button>
              {/* Phones get this CTA from the hero section instead — three items don't fit */}
              <Button
                variant="outline"
                className="hidden sm:inline-flex"
                onClick={() => {
                  document
                    .getElementById('contact-form')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Solicitar Acceso
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Plataforma de Gestión Moderna
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            La solución completa para administrar tu fraccionamiento
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Simplifica la gestión de tu comunidad con una plataforma integral
            que centraliza comunicación, pagos, documentos y mucho más.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-lg px-8"
              onClick={() => {
                document
                  .getElementById('contact-form')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Comenzar Ahora
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8"
              onClick={() => {
                document
                  .getElementById('features')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Ver Características
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Todo lo que necesitas en un solo lugar
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Funcionalidades diseñadas específicamente para la gestión eficiente
            de fraccionamientos
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/50"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-secondary/50 py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                ¿Por qué elegir Fraccio?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Una plataforma diseñada pensando en la facilidad de uso y la
                eficiencia operativa de tu fraccionamiento.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-xl border">
              <div className="space-y-6">
                <div className="text-center pb-6 border-b">
                  <div className="text-5xl font-bold text-primary mb-2">
                    100%
                  </div>
                  <div className="text-muted-foreground">
                    Digital y en la nube
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold mb-1">24/7</div>
                    <div className="text-sm text-muted-foreground">
                      Acceso disponible
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-1">∞</div>
                    <div className="text-sm text-muted-foreground">
                      Colonos ilimitados
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      <Users className="inline h-8 w-8" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Acceso por fraccionamiento y rol
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      <CreditCard className="inline h-8 w-8" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pagos procesados por Stripe
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section
        id="contact-form"
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Solicita acceso a Fraccio
            </h2>
            <p className="text-xl text-muted-foreground">
              Completa el formulario y nos pondremos en contacto contigo para
              brindarte acceso a la plataforma
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 shadow-xl border">
            {isSubmitted ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">¡Solicitud Enviada!</h3>
                <p className="text-muted-foreground">
                  Nos pondremos en contacto contigo pronto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Juan Pérez"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="juan@ejemplo.com"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+52 123 456 7890"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fraccionamiento">
                    Nombre del Fraccionamiento *
                  </Label>
                  <Input
                    id="fraccionamiento"
                    name="fraccionamiento"
                    type="text"
                    required
                    value={formData.fraccionamiento}
                    onChange={handleChange}
                    placeholder="Residencial Las Palmas"
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full text-lg h-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Solicitar Acceso'}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Al enviar este formulario, aceptas que nos pongamos en
                  contacto contigo para proporcionarte información sobre
                  Fraccio.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Fraccio</span>
              </div>
              <p className="text-muted-foreground">
                La plataforma integral para la gestión moderna de
                fraccionamientos.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Características</h3>
              <ul className="space-y-2 text-muted-foreground">
                {features.map((feature) => (
                  <li key={feature.title}>{feature.title}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contacto</h3>
              <p className="text-muted-foreground mb-2">
                ¿Tienes preguntas? Estamos aquí para ayudarte.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  document
                    .getElementById('contact-form')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Contactar
              </Button>
            </div>
          </div>

          <div className="border-t pt-8 text-center text-muted-foreground">
            <p>
              &copy; {new Date().getFullYear()} Fraccio. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
