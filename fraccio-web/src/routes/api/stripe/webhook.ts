import { createFileRoute } from '@tanstack/react-router'
import Stripe from 'stripe'
import { logger } from '@/utils/logger'
import { getSupabaseClient } from '@/lib/supabase'

// Initialize Stripe
const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia',
  })
}

export const Route = createFileRoute('/api/stripe/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        logger('info', 'Stripe webhook received')
        const stripe = getStripeClient()
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

        if (!webhookSecret) {
          logger('error', 'STRIPE_WEBHOOK_SECRET is not configured')
          return new Response('Webhook secret not configured', { status: 500 })
        }

        // Get the raw body as text
        const body = await request.text()
        const signature = request.headers.get('stripe-signature')

        if (!signature) {
          logger('error', 'No Stripe signature found in request')
          return new Response('No signature', { status: 400 })
        }

        let event: Stripe.Event

        // Verify webhook signature
        try {
          event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
        } catch (err: any) {
          logger('error', 'Webhook signature verification failed', { error: err.message })
          return new Response(`Webhook Error: ${err.message}`, { status: 400 })
        }

        logger('info', 'Webhook received', { type: event.type, id: event.id })

        const supabase = getSupabaseClient()
        try {
          // Handle the event
          switch (event.type) {
            case 'checkout.session.completed': {
              const session = event.data.object as Stripe.Checkout.Session

              logger('info', 'Checkout session completed', {
                sessionId: session.id,
                paymentStatus: session.payment_status,
                metadata: session.metadata,
              })

              // Update payment status to completed
              if (session.metadata?.payment_id) {
                const { error } = await supabase
                  .from('payments')
                  .update({
                    status: session.payment_status === 'paid' ? 'completed': 'pending',
                    stripe_payment_intent_id: session.payment_intent as string,
                  })
                  .eq('id', parseInt(session.metadata.payment_id))

                if (error) {
                  logger('error', 'Failed to update payment status', {
                    paymentId: session.metadata.payment_id,
                    error,
                  })
                } else {
                  logger('info', 'Payment status updated to completed', {
                    paymentId: session.metadata.payment_id,
                  })
                }
              }
              break
            }

            case 'payment_intent.succeeded': {
              const paymentIntent = event.data.object as Stripe.PaymentIntent

              logger('info', 'Payment intent succeeded', {
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
              })

              // Update payment with receipt URL
              const { error } = await supabase
                .from('payments')
                .update({
                  // receipt_url: paymentIntent.charges?.data[0]?.receipt_url || null,
                  status: 'completed',
                })
                .eq('stripe_payment_intent_id', paymentIntent.id)

              if (error) {
                logger('error', 'Failed to update payment with receipt URL', {
                  paymentIntentId: paymentIntent.id,
                  error,
                })
              } else {
                logger('info', 'Payment updated with receipt URL', {
                  paymentIntentId: paymentIntent.id,
                })
              }
              break
            }

            case 'payment_intent.payment_failed': {
              const paymentIntent = event.data.object as Stripe.PaymentIntent

              logger('warn', 'Payment intent failed', {
                paymentIntentId: paymentIntent.id,
                failureMessage: paymentIntent.last_payment_error?.message,
              })

              // Update payment status to failed
              const { error } = await supabase
                .from('payments')
                .update({
                  status: 'failed',
                })
                .eq('stripe_payment_intent_id', paymentIntent.id)

              if (error) {
                logger('error', 'Failed to update payment status to failed', {
                  paymentIntentId: paymentIntent.id,
                  error,
                })
              } else {
                logger('info', 'Payment status updated to failed', {
                  paymentIntentId: paymentIntent.id,
                })
              }
              break
            }

            default:
              logger('info', 'Unhandled webhook event type', { type: event.type })
          }

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error: any) {
          logger('error', 'Error processing webhook', { error: error.message })
          return new Response(`Webhook Error: ${error.message}`, { status: 500 })
        }
      }
    }
  }
})
