import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-success/10 p-4 rounded-full mb-6">
        <CheckCircle size={64} className="text-success" />
      </div>
      <h2 className="text-3xl font-bold text-textPrimary mb-2">Payment Successful!</h2>
      <p className="text-textSecondary mb-6">
        Thank you for your purchase. Your order ID is <span className="font-bold text-textPrimary">{orderId || 'N/A'}</span>
      </p>
      <div className="flex gap-4">
        <button onClick={() => navigate('/')} className="btn-primary">
          Continue Shopping
        </button>
        <button onClick={() => navigate('/profile')} className="btn-secondary">
          Go to Library
        </button>
      </div>
    </div>
  );
}
