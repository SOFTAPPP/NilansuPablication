import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const reason = searchParams.get('reason');

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-danger/10 p-4 rounded-full mb-6">
        <XCircle size={64} className="text-danger" />
      </div>
      <h2 className="text-3xl font-bold text-textPrimary mb-2">Payment Failed</h2>
      
      <p className="text-textSecondary mb-4">
        Unfortunately, your payment could not be completed.
      </p>

      {reason && (
        <p className="text-sm font-medium text-danger mb-6 bg-danger/10 px-4 py-2 rounded-lg">
          Reason: {reason.replace(/_/g, ' ')}
        </p>
      )}

      {orderId && (
        <p className="text-xs text-textSecondary mb-6">
          Order ID: {orderId}
        </p>
      )}

      <div className="flex gap-4">
        <button onClick={() => navigate('/checkout')} className="btn-primary">
          Try Again
        </button>
        <button onClick={() => navigate('/contact-us')} className="btn-secondary">
          Contact Support
        </button>
      </div>
    </div>
  );
}
