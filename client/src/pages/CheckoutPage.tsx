import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Button, Input, Skeleton } from '@/components/ui';
import { formatPrice, resolveImageUrl } from '@/lib/catalog';
import {
  confirmDemoPayment,
  createAddress,
  createCheckoutOrder,
  createPaymentIntent,
  estimatedDeliveryLabel,
  listAddresses,
  type Address,
  type OrderSummary,
  type PaymentIntentPayload,
} from '@/lib/checkout';
import {
  checkoutSteps,
  shippingAddressSchema,
  type ShippingAddressFormValues,
} from '@/lib/checkoutSchemas';
import { getErrorMessage } from '@/lib/api';
import { hasStripeConfig, stripePromise } from '@/lib/stripe';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/useCartStore';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { toast } from '@/store/useToastStore';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=80';

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {checkoutSteps.map((item, index) => {
        const active = step === item.id;
        const done = step > item.id;
        return (
          <li key={item.id} className="flex items-center gap-2 sm:gap-3">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                done || active
                  ? 'bg-primary-600 text-white'
                  : 'border border-border bg-surface-raised text-content-muted',
              )}
            >
              {done ? '✓' : item.id}
            </div>
            <span
              className={cn(
                'hidden text-sm font-medium sm:inline',
                active ? 'text-content' : 'text-content-muted',
              )}
            >
              {item.label}
            </span>
            {index < checkoutSteps.length - 1 ? (
              <div className="h-px w-6 bg-border sm:w-10" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function OrderSidebar({
  cartSubtotal,
  order,
}: {
  cartSubtotal: string;
  order: OrderSummary | null;
}) {
  const cart = useCartStore((s) => s.cart);

  return (
    <aside className="h-fit rounded-2xl border border-border bg-surface-raised p-5 shadow-soft">
      <h2 className="text-sm font-semibold text-content">Summary</h2>
      <div className="mt-4 space-y-3">
        {(order?.items ?? cart?.items ?? []).slice(0, 4).map((item) => {
          const name = 'productName' in item ? item.productName : item.product.name;
          const image =
            'product' in item
              ? resolveImageUrl(item.product.images[0], PLACEHOLDER)
              : PLACEHOLDER;
          const line = item.lineTotal;
          return (
            <div key={item.id} className="flex gap-3">
              <img src={image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-content">{name}</p>
                <p className="text-xs text-content-muted">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-medium text-content">{formatPrice(line)}</p>
            </div>
          );
        })}
      </div>
      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        {order ? (
          <>
            <div className="flex justify-between">
              <dt className="text-content-muted">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-muted">Shipping</dt>
              <dd>{formatPrice(order.shippingCost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-muted">Tax</dt>
              <dd>{formatPrice(order.tax)}</dd>
            </div>
            {Number(order.discountAmount) > 0 ? (
              <div className="flex justify-between text-success-600">
                <dt>Discount</dt>
                <dd>−{formatPrice(order.discountAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </>
        ) : (
          <div className="flex justify-between font-semibold">
            <dt>Cart subtotal</dt>
            <dd>{formatPrice(cartSubtotal)}</dd>
          </div>
        )}
      </dl>
      {order ? (
        <p className="mt-3 text-xs text-content-subtle">
          Est. delivery {estimatedDeliveryLabel(new Date(order.createdAt))}
        </p>
      ) : null}
    </aside>
  );
}

function PaymentStepForm({
  onReadyForReview,
}: {
  onReadyForReview: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  async function continueToReview() {
    if (!stripe || !elements) {
      toast.error('Stripe is still loading');
      return;
    }
    setSaving(true);
    try {
      const result = await elements.submit();
      if (result.error) {
        toast.error('Card details incomplete', result.error.message);
        return;
      }
      onReadyForReview();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content">Payment</h2>
        <p className="mt-1 text-sm text-content-muted">
          Enter your card details. You won’t be charged until you confirm on the next step.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <Button onClick={() => void continueToReview()} isLoading={saving}>
        Continue to review
      </Button>
    </div>
  );
}

function ReviewAndPay({
  order,
  clientSecret,
  onBack,
}: {
  order: OrderSummary;
  clientSecret: string;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const fetchCart = useCartStore((s) => s.fetchCart);
  const resetCheckout = useCheckoutStore((s) => s.resetCheckout);
  const [paying, setPaying] = useState(false);

  async function confirmPayment() {
    if (!stripe || !elements) {
      toast.error('Stripe is still loading');
      return;
    }

    setPaying(true);
    try {
      const returnUrl = `${window.location.origin}/orders/${order.id}/confirmation`;
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              name: order.shippingAddress.fullName,
            },
          },
        },
        redirect: 'if_required',
      });

      if (result.error) {
        toast.error('Payment failed', result.error.message ?? 'Try another card');
        return;
      }

      if (
        result.paymentIntent?.status === 'succeeded' ||
        result.paymentIntent?.status === 'processing'
      ) {
        await fetchCart();
        resetCheckout();
        toast.success('Payment submitted');
        navigate(`/orders/${order.id}/confirmation`, { replace: true });
        return;
      }

      toast.warning('Additional action required', 'Follow the prompts from your bank if shown.');
    } catch (error) {
      toast.error('Payment error', getErrorMessage(error));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content">Review & pay</h2>
        <p className="mt-1 text-sm text-content-muted">
          Confirm shipping and place your order for {formatPrice(order.total)}.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 text-sm">
        <p className="font-medium text-content">Ship to</p>
        <p className="mt-1 text-content-muted">
          {order.shippingAddress.fullName}
          <br />
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
          {order.shippingAddress.postalCode}
          <br />
          {order.shippingAddress.country}
        </p>
        <p className="mt-3 text-content-muted">
          Order <span className="font-medium text-content">{order.orderNumber}</span>
        </p>
        <p className="mt-1 text-content-muted">
          Estimated delivery {estimatedDeliveryLabel(new Date(order.createdAt))}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onBack} disabled={paying}>
          Back
        </Button>
        <Button onClick={() => void confirmPayment()} isLoading={paying}>
          Pay {formatPrice(order.total)}
        </Button>
      </div>
    </div>
  );
}

function isDemoPayment(payment: PaymentIntentPayload | null): boolean {
  return payment?.mode === 'demo' || Boolean(payment?.clientSecret?.startsWith('pi_dev_'));
}

function DemoPaymentStep({ onReadyForReview }: { onReadyForReview: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content">Payment</h2>
        <p className="mt-1 text-sm text-content-muted">
          Stripe test keys are not configured, so this local checkout will mark the order paid
          without charging a card. Add real <code className="text-xs">sk_test_</code> /{' '}
          <code className="text-xs">pk_test_</code> keys to enable Stripe Elements.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 text-sm text-content-muted">
        Demo card: any future expiry and CVC. No payment is sent to Stripe.
      </div>
      <Button onClick={onReadyForReview}>Continue to review</Button>
    </div>
  );
}

function DemoReviewAndPay({
  order,
  clientSecret,
  onBack,
}: {
  order: OrderSummary;
  clientSecret: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const fetchCart = useCartStore((s) => s.fetchCart);
  const resetCheckout = useCheckoutStore((s) => s.resetCheckout);
  const [paying, setPaying] = useState(false);

  async function confirmPayment() {
    setPaying(true);
    try {
      await confirmDemoPayment(order.id, clientSecret);
      await fetchCart();
      resetCheckout();
      toast.success('Payment submitted');
      navigate(`/orders/${order.id}/confirmation`, { replace: true });
    } catch (error) {
      toast.error('Payment error', getErrorMessage(error));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-content">Review & pay</h2>
        <p className="mt-1 text-sm text-content-muted">
          Confirm shipping and place your order for {formatPrice(order.total)}.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 text-sm">
        <p className="font-medium text-content">Ship to</p>
        <p className="mt-1 text-content-muted">
          {order.shippingAddress.fullName}
          <br />
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
          {order.shippingAddress.postalCode}
          <br />
          {order.shippingAddress.country}
        </p>
        <p className="mt-3 text-content-muted">
          Order <span className="font-medium text-content">{order.orderNumber}</span>
        </p>
        <p className="mt-1 text-content-muted">
          Estimated delivery {estimatedDeliveryLabel(new Date(order.createdAt))}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onBack} disabled={paying}>
          Back
        </Button>
        <Button onClick={() => void confirmPayment()} isLoading={paying}>
          Pay {formatPrice(order.total)}
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const cart = useCartStore((s) => s.cart);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const promoCode = useCheckoutStore((s) => s.promoCode);
  const setShippingAddressId = useCheckoutStore((s) => s.setShippingAddressId);
  const notes = useCheckoutStore((s) => s.notes);
  const setNotes = useCheckoutStore((s) => s.setNotes);

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [payment, setPayment] = useState<PaymentIntentPayload | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const form = useForm<ShippingAddressFormValues>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      fullName: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      saveAddress: true,
      existingAddressId: '',
    },
  });

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAddresses(true);
      try {
        const list = await listAddresses();
        if (cancelled) return;
        setAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) {
          form.setValue('existingAddressId', preferred.id);
          form.setValue('fullName', preferred.fullName);
          form.setValue('line1', preferred.line1);
          form.setValue('line2', preferred.line2 ?? '');
          form.setValue('city', preferred.city);
          form.setValue('state', preferred.state);
          form.setValue('postalCode', preferred.postalCode);
          form.setValue('country', preferred.country);
          form.setValue('phone', preferred.phone ?? '');
        }
      } catch (error) {
        if (!cancelled) setPageError(getErrorMessage(error, 'Could not load addresses'));
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [form]);

  const selectedExistingId = form.watch('existingAddressId');

  useEffect(() => {
    if (!selectedExistingId) return;
    const selected = addresses.find((a) => a.id === selectedExistingId);
    if (!selected) return;
    form.setValue('fullName', selected.fullName);
    form.setValue('line1', selected.line1);
    form.setValue('line2', selected.line2 ?? '');
    form.setValue('city', selected.city);
    form.setValue('state', selected.state);
    form.setValue('postalCode', selected.postalCode);
    form.setValue('country', selected.country);
    form.setValue('phone', selected.phone ?? '');
  }, [selectedExistingId, addresses, form]);

  async function submitShipping(values: ShippingAddressFormValues) {
    setPageError(null);
    setCreatingOrder(true);
    try {
      let shippingAddressId = values.existingAddressId?.trim() || '';

      if (!shippingAddressId) {
        const created = await createAddress({
          type: 'SHIPPING',
          fullName: values.fullName,
          line1: values.line1,
          line2: values.line2 || null,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: values.country,
          phone: values.phone || null,
          isDefault: true,
        });
        shippingAddressId = created.id;
        setAddresses((prev) => [created, ...prev]);
      }

      setShippingAddressId(shippingAddressId);

      const result = await createCheckoutOrder({
        shippingAddressId,
        couponCode: promoCode || undefined,
        notes: notes || undefined,
      });

      setOrder(result.order);
      let paymentPayload = result.payment;
      if (!paymentPayload?.clientSecret) {
        paymentPayload = await createPaymentIntent(result.order.id);
      }
      setPayment(paymentPayload);
      await fetchCart();
      setStep(2);
      toast.success('Shipping saved', 'Continue with payment details.');
    } catch (error) {
      const message = getErrorMessage(error, 'Could not start checkout');
      setPageError(message);
      toast.error('Checkout failed', message);
    } finally {
      setCreatingOrder(false);
    }
  }

  const stripeOptions = useMemo(() => {
    if (!payment?.clientSecret) return undefined;
    return {
      clientSecret: payment.clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          borderRadius: '12px',
          colorPrimary: '#2563eb',
        },
      },
    };
  }, [payment?.clientSecret]);

  if (!cart?.items.length && !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold text-content">Nothing to checkout</h1>
        <p className="mt-2 text-sm text-content-muted">Add items to your cart first.</p>
        <Link to="/products" className="mt-6 inline-block">
          <Button>Browse products</Button>
        </Link>
      </div>
    );
  }

  const demoCheckout = isDemoPayment(payment);
  const liveStripeCheckout =
    Boolean(hasStripeConfig() && stripePromise && payment?.clientSecret && stripeOptions && !demoCheckout);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Checkout</h1>
          <p className="mt-1 text-sm text-content-muted">
            {demoCheckout
              ? 'Local demo checkout — Stripe keys are placeholders.'
              : 'Secure payment powered by Stripe.'}
          </p>
        </div>
        <StepIndicator step={step} />
      </div>

      {pageError ? (
        <div className="mb-6 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800 dark:border-danger-800 dark:bg-danger-900/30 dark:text-danger-100">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-soft sm:p-6">
          {step === 1 ? (
            loadingAddresses ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form className="space-y-4" onSubmit={form.handleSubmit(submitShipping)}>
                <div>
                  <h2 className="text-lg font-semibold text-content">Shipping address</h2>
                  <p className="mt-1 text-sm text-content-muted">
                    Where should we send this order?
                  </p>
                </div>

                {addresses.length > 0 ? (
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-content">Saved addresses</span>
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm shadow-soft focus-ring"
                      {...form.register('existingAddressId')}
                    >
                      <option value="">Enter a new address</option>
                      {addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.fullName} — {address.line1}, {address.city}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <Controller
                  control={form.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <Input label="Full name" error={fieldState.error?.message} {...field} />
                  )}
                />
                <Controller
                  control={form.control}
                  name="line1"
                  render={({ field, fieldState }) => (
                    <Input label="Address line 1" error={fieldState.error?.message} {...field} />
                  )}
                />
                <Controller
                  control={form.control}
                  name="line2"
                  render={({ field, fieldState }) => (
                    <Input label="Address line 2" error={fieldState.error?.message} {...field} />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="city"
                    render={({ field, fieldState }) => (
                      <Input label="City" error={fieldState.error?.message} {...field} />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="state"
                    render={({ field, fieldState }) => (
                      <Input label="State" error={fieldState.error?.message} {...field} />
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="postalCode"
                    render={({ field, fieldState }) => (
                      <Input label="Postal code" error={fieldState.error?.message} {...field} />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="country"
                    render={({ field, fieldState }) => (
                      <Input
                        label="Country (ISO)"
                        hint="e.g. US"
                        error={fieldState.error?.message}
                        {...field}
                      />
                    )}
                  />
                </div>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Input label="Phone" error={fieldState.error?.message} {...field} />
                  )}
                />

                <Input
                  label="Order notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery instructions"
                />

                {promoCode ? (
                  <p className="text-sm text-success-600">Promo applied: {promoCode}</p>
                ) : null}

                <Button type="submit" isLoading={creatingOrder} className="w-full sm:w-auto">
                  Continue to payment
                </Button>
              </form>
            )
          ) : null}

          {step >= 2 && liveStripeCheckout ? (
            <Elements stripe={stripePromise} options={stripeOptions}>
              {step === 2 ? (
                <PaymentStepForm onReadyForReview={() => setStep(3)} />
              ) : null}
              {step === 3 && order && payment?.clientSecret ? (
                <ReviewAndPay
                  order={order}
                  clientSecret={payment.clientSecret}
                  onBack={() => setStep(2)}
                />
              ) : null}
            </Elements>
          ) : null}

          {step >= 2 && demoCheckout && payment?.clientSecret ? (
            <>
              {step === 2 ? (
                <DemoPaymentStep onReadyForReview={() => setStep(3)} />
              ) : null}
              {step === 3 && order ? (
                <DemoReviewAndPay
                  order={order}
                  clientSecret={payment.clientSecret}
                  onBack={() => setStep(2)}
                />
              ) : null}
            </>
          ) : null}

          {step >= 2 && !payment?.clientSecret ? (
            <div className="space-y-3">
              <p className="text-sm text-danger-600">
                Payment intent is missing. You can retry creating it for this order.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (!order) return;
                  void createPaymentIntent(order.id)
                    .then((payload) => {
                      setPayment(payload);
                      toast.success('Payment ready');
                    })
                    .catch((error) => toast.error('Retry failed', getErrorMessage(error)));
                }}
              >
                Retry payment setup
              </Button>
            </div>
          ) : null}
        </div>

        <OrderSidebar cartSubtotal={cart?.subtotal ?? order?.subtotal ?? '0.00'} order={order} />
      </div>
    </div>
  );
}
