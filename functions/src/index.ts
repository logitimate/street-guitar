import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

admin.initializeApp();
const db = admin.firestore();

const stripeSecretKey     = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const stripePriceId       = defineSecret('STRIPE_PRICE_ID');
const referralCouponId    = defineSecret('STRIPE_REFERRAL_COUPON_ID');
const appUrl              = defineSecret('APP_URL'); // e.g. https://loganliv.github.io/street-guitar

const MAX_REFERRALS          = 3;
const REFERRAL_CREDIT_CENTS  = 1000; // $10.00 USD

// ─── createCheckoutSession ───────────────────────────────────────────────────

export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey, stripePriceId, referralCouponId, appUrl], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const uid    = request.auth.uid;
    const stripe = new Stripe(stripeSecretKey.value());

    const userRef  = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError('not-found', 'User not found');
    const userData = userSnap.data()!;

    // Create Stripe customer on first checkout
    let customerId: string = userData['stripeCustomerId'] ?? '';
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    userData['email'],
        name:     userData['name'],
        metadata: { uid },
      });
      customerId = customer.id;
      await userRef.update({ stripeCustomerId: customerId });
    }

    // Apply free-month coupon if user was referred and hasn't subscribed yet
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (userData['referredBy'] && !userData['subscribed']) {
      discounts.push({ coupon: referralCouponId.value() });
    }

    const base = appUrl.value();
    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: stripePriceId.value(), quantity: 1 }],
      discounts:            discounts.length ? discounts : undefined,
      success_url:          `${base}/#/learn?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${base}/#/`,
    });

    return { url: session.url };
  },
);

// ─── handleStripeWebhook ─────────────────────────────────────────────────────

export const handleStripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    console.log('Webhook received:', req.method, req.headers['stripe-signature'] ? 'sig present' : 'NO SIG');

    const stripe = new Stripe(stripeSecretKey.value());
    const sig    = req.headers['stripe-signature'] as string;

    if (!sig) {
      console.error('Missing stripe-signature header');
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;
    console.log('rawBody type:', typeof rawBody, 'length:', rawBody?.length ?? 'undefined');

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret.value());
      console.log('Event verified:', event.type, event.id);
    } catch (err) {
      console.error('Signature verification failed:', (err as Error).message);
      res.status(400).send('Webhook signature verification failed');
      return;
    }

    if (event.type === 'invoice.payment_succeeded') {
      await handlePaymentSucceeded(stripe, event.data.object as Stripe.Invoice);
    }

    if (event.type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    }

    res.json({ received: true });
  },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function handlePaymentSucceeded(stripe: Stripe, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;
  if (!customerId) return;

  const usersSnap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  if (usersSnap.empty) return;

  const userRef  = usersSnap.docs[0].ref;
  const userData = usersSnap.docs[0].data();

  await userRef.update({ subscribed: true });

  // Reward referrer only on first real payment (amount_paid > 0)
  if (
    invoice.amount_paid > 0 &&
    userData['referredBy'] &&
    !userData['referralRewarded']
  ) {
    await userRef.update({ referralRewarded: true });
    await rewardReferrer(stripe, userData['referredBy']);
  }
}

async function rewardReferrer(stripe: Stripe, referralCode: string) {
  const referrerSnap = await db.collection('users')
    .where('referralCode', '==', referralCode)
    .limit(1)
    .get();
  if (referrerSnap.empty) return;

  const referrerRef  = referrerSnap.docs[0].ref;
  const referrerData = referrerSnap.docs[0].data();

  if ((referrerData['referralCount'] ?? 0) >= MAX_REFERRALS) return;
  if (!referrerData['stripeCustomerId']) return;

  await stripe.customers.createBalanceTransaction(referrerData['stripeCustomerId'], {
    amount:      -REFERRAL_CREDIT_CENTS, // negative = credit on account
    currency:    'usd',
    description: 'Referral reward',
  });

  await referrerRef.update({
    referralCount: admin.firestore.FieldValue.increment(1),
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string'
    ? sub.customer
    : sub.customer?.id;
  if (!customerId) return;

  const usersSnap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  if (!usersSnap.empty) {
    await usersSnap.docs[0].ref.update({ subscribed: false });
  }
}
