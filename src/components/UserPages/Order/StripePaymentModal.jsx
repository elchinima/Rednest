import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import featureStripeIcon from '../../../assets/icons/feature-stripe.svg';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import './StripePaymentModal.scss';

let stripePromiseCache = null;
const getStripePromise = (publishableKey) => {
  if (!stripePromiseCache && publishableKey) {
    stripePromiseCache = loadStripe(publishableKey);
  }
  return stripePromiseCache;
};

const StripeCheckoutForm = ({ totalAmount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCard, setCopiedCard] = useState(false);

  const handleCopyTestCard = () => {
    navigator.clipboard.writeText('4242424242424242');
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (result.error) {
        setErrorMessage(result.error.message || 'Payment could not be processed. Please check your card details.');
        setIsProcessing(false);
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        await onSuccess(result.paymentIntent.id);
      } else {
        setErrorMessage('Payment could not be confirmed.');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Stripe submit error:', err);
      setErrorMessage('An unexpected error occurred during payment processing.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="stripe-checkout-form">
      <div className="stripe-test-banner">
        <div className="stripe-test-banner__badge">TEST MODE</div>
        <div className="stripe-test-banner__text">
          <span>Card:</span>
          <code className="stripe-test-card-num">4242 4242 4242 4242</code>
        </div>
        <button
          type="button"
          className="stripe-test-copy-btn"
          onClick={handleCopyTestCard}
        >
          {copiedCard ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="stripe-elements-container">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {errorMessage && (
        <div className="stripe-error-message">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="stripe-checkout-actions">
        <button
          type="button"
          className="cta-btn sm stripe-modal-btn stripe-modal-btn--cancel"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Back
        </button>
        <button
          type="submit"
          className="cta-btn sm stripe-modal-btn stripe-modal-btn--pay"
          disabled={!stripe || !elements || isProcessing}
        >
          {isProcessing ? (
            <span className="stripe-btn-loading">
              <img src={loaderIcon} alt="Loading" className="stripe-spinner" />
              Processing Payment...
            </span>
          ) : (
            `Pay ${totalAmount} ₼`
          )}
        </button>
      </div>
    </form>
  );
};

const StripePaymentModal = ({
  isOpen,
  onClose,
  serviceId,
  finalAmount,
  onOrderSuccess,
}) => {
  const [clientSecret, setClientSecret] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!isOpen) {
      setClientSecret('');
      setIntentError('');
      return;
    }

    let isMounted = true;

    const initStripe = async () => {
      setLoadingIntent(true);
      setIntentError('');

      try {
        let pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
        if (!pk) {
          try {
            const configRes = await fetch(`${apiUrl}/api/orders/stripe/config`);
            if (configRes.ok) {
              const configData = await configRes.json();
              pk = configData.publishableKey || '';
            }
          } catch (e) {
            console.error('Failed to fetch stripe config:', e);
          }
        }

        if (!pk) {
          if (isMounted) {
            setIntentError('Stripe publishable key is missing. Please check your environment configuration.');
            setLoadingIntent(false);
          }
          return;
        }

        if (isMounted) {
          setPublishableKey(pk);
          setStripePromise(getStripePromise(pk));
        }

        const res = await fetchWithRefresh(`${apiUrl}/api/orders/stripe/create-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod: serviceId || 'OnlineStripe' }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setIntentError(data.message || 'Failed to initialize Stripe payment.');
        }
      } catch (err) {
        console.error('Stripe init error:', err);
        if (isMounted) {
          setIntentError('Error connecting to payment service. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoadingIntent(false);
        }
      }
    };

    initStripe();

    return () => {
      isMounted = false;
    };
  }, [isOpen, serviceId, apiUrl]);

  const handleStripeSuccess = async (paymentIntentId) => {
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/orders/stripe/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethod: serviceId || 'OnlineStripe',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onOrderSuccess(data);
      } else {
        setIntentError(data.message || 'Payment succeeded, but order creation failed. Please contact support.');
      }
    } catch (err) {
      console.error('Stripe confirm error:', err);
      setIntentError('Error confirming order with server.');
    }
  };

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#ef4444',
      colorBackground: '#1a0b0b',
      colorText: '#ffffff',
      colorDanger: '#f87171',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      borderRadius: '12px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#ffffff',
        boxShadow: 'none',
      },
      '.Input:focus': {
        borderColor: '#ef4444',
        boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.25)',
      },
      '.Label': {
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        fontSize: '0.85rem',
      },
      '.Tab': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#ffffff',
      },
      '.Tab--selected': {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: '#ef4444',
      },
    },
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={onClose} targetBorderRadius="24px">
      <div className="stripe-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="stripe-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="stripe-modal__header">
          <div className="stripe-modal__icon">
            <img src={featureStripeIcon} alt="Stripe" />
          </div>
          <h3 className="stripe-modal__title">Card & Online Payment</h3>
          <p className="stripe-modal__desc">
            Amount to pay: <span className="stripe-modal__amount">{finalAmount} ₼</span>
          </p>
        </div>

        {loadingIntent && (
          <div className="stripe-modal__loading">
            <img src={loaderIcon} alt="Loading" className="stripe-spinner-lg" />
            <p>Initializing secure payment...</p>
          </div>
        )}

        {intentError && (
          <div className="stripe-modal__error">
            <p>⚠️ {intentError}</p>
            <button type="button" className="cta-btn sm stripe-modal-btn" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {!loadingIntent && !intentError && clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
            <StripeCheckoutForm
              totalAmount={finalAmount}
              onSuccess={handleStripeSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </AnimatedModalWrapper>
  );
};

export default StripePaymentModal;
