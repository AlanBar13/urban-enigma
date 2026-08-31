import { Check, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Lo que cambia entre planes. Las funciones compartidas viven en `included`. */
const plans = [
  {
    id: 'arranque',
    name: 'Arranque',
    price: 0,
    pitch: 'Para probar la plataforma completa sin pagar mensualidad.',
    houses: 'Hasta 10 casas',
    fee: '$10 MXN',
    extras: [],
    missing: ['Anuncios por correo', 'Control de visitas y caseta'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'basico',
    name: 'Básico',
    price: 490,
    pitch: 'Para privadas y fraccionamientos chicos que ya operan a diario.',
    houses: 'Hasta 50 casas',
    fee: '$8 MXN',
    extras: ['Anuncios por correo'],
    missing: ['Control de visitas y caseta'],
    cta: 'Elegir Básico',
    highlight: false,
  },
  {
    id: 'esencial',
    name: 'Esencial',
    price: 990,
    pitch: 'Suma caseta y control de visitas, con la comisión a la mitad.',
    houses: 'Hasta 200 casas',
    fee: '$5 MXN',
    extras: ['Control de visitas y caseta'],
    missing: [],
    cta: 'Elegir Esencial',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1890,
    pitch:
      'Para fraccionamientos grandes: comisión casi simbólica y lo nuevo primero.',
    houses: 'Hasta 400 casas',
    fee: '$2 MXN',
    extras: ['Soporte prioritario'],
    missing: [],
    cta: 'Elegir Pro',
    highlight: false,
  },
]

/** El plan anterior en la escalera, para el encabezado "Todo lo de X, más". */
const previousPlan: Record<string, string> = {
  basico: 'Arranque',
  esencial: 'Básico',
  pro: 'Esencial',
}

/** Para mostrar el plan elegido en el formulario de contacto. */
export const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  plans.map((plan) => [plan.id, plan.name]),
)

/** En los tres planes. Se lista una vez para que la tabla no repita 15 palomitas. */
const included = [
  'Casas, colonos, roles e invitaciones',
  'Anuncios con notificaciones push',
  'Documentos en la nube',
  'Cuotas y pagos en línea con tarjeta',
  'Comprobantes de efectivo y transferencia',
]

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-MX').format(price)

export default function PricingSection({
  onSelectPlan,
}: {
  onSelectPlan: (planId: string) => void
}) {
  const selectPlan = (planId: string) => {
    onSelectPlan(planId)
    document
      .getElementById('contact-form')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="precios"
      className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24"
    >
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          Un precio claro por fraccionamiento
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sin contratos forzosos, sin costo por colono y sin cargos sorpresa:
          cada plan tiene un límite de casas fijo. Entre más grande el plan,
          menor la comisión que pagan tus colonos por cada cuota.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={
              plan.highlight
                ? 'relative bg-card rounded-2xl p-6 shadow-xl border lg:-mt-4'
                : 'relative rounded-xl border bg-card p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/50'
            }
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-8 inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-medium text-primary">
                  Más elegido
                </span>
              </div>
            )}

            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mb-6 min-h-[3.5rem]">
              {plan.pitch}
            </p>

            <div className="mb-1">
              <span className="text-4xl font-bold">
                ${formatPrice(plan.price)}
              </span>
              <span className="text-muted-foreground ml-2 text-sm">
                MXN / mes
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {plan.price === 0 ? 'Sin mensualidad' : 'Facturado mensualmente'}
            </p>

            <Button
              variant={plan.highlight ? 'default' : 'outline'}
              className="w-full mb-6"
              onClick={() => selectPlan(plan.id)}
            >
              {plan.cta}
            </Button>

            <dl className="space-y-3 pb-6 mb-6 border-b">
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">Casas</dt>
                <dd className="font-medium text-right">{plan.houses}</dd>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">Comisión</dt>
                <dd className="font-semibold text-right">
                  {plan.fee}
                  <span className="block text-xs font-normal text-muted-foreground">
                    por pago recibido
                  </span>
                </dd>
              </div>
            </dl>

            <p className="text-sm font-semibold mb-3">
              {previousPlan[plan.id]
                ? `Todo lo de ${previousPlan[plan.id]}, más`
                : 'Incluye'}
            </p>
            <ul className="space-y-2">
              {(plan.id === 'arranque' ? included : plan.extras).map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {plan.missing.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Minus className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Transparencia de comisiones: mejor decirlo aquí que en la llamada de ventas */}
      <div className="mt-12 max-w-3xl mx-auto rounded-xl bg-secondary/50 p-6 md:p-8">
        <h3 className="font-semibold mb-3">Cómo funcionan las comisiones</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            Cuando un colono paga su cuota con tarjeta, Stripe cobra su comisión
            de procesamiento: <strong>3.6% + $3 MXN</strong>. Esa la cobra
            Stripe, no Fraccio.
          </li>
          <li>
            Encima de eso, Fraccio cobra una comisión fija por pago recibido:{' '}
            <strong>$10, $8, $5 o $2 MXN</strong> según tu plan. Es la única
            comisión nuestra y baja conforme subes de plan.
          </li>
          <li>
            El límite de casas es un <strong>tope, no un cargo</strong>: al
            llegar al máximo de tu plan no te cobramos de más, simplemente
            cambias de plan cuando lo necesites.
          </li>
          <li>
            Los pagos en efectivo o por transferencia que registres con
            comprobante <strong>no pagan ninguna comisión</strong>.
          </li>
          <li>
            El dinero de las cuotas llega directo a la cuenta bancaria del
            fraccionamiento. Fraccio nunca la retiene.
          </li>
        </ul>
      </div>
    </section>
  )
}
