import React, { useState } from 'react';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <h1 className="text-4xl font-bold text-textPrimary mb-6 text-center">Track Order</h1>
      <p className="text-textSecondary mb-8 text-center">Enter your order ID below to check its current status.</p>
      
      <form className="space-y-4 bg-surface p-8 rounded-3xl border border-divider shadow-sm" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-2">Order ID</label>
          <input 
            type="text" 
            placeholder="e.g. NP-123456" 
            className="w-full bg-background border border-divider rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-textPrimary"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
        </div>
        <button type="submit" className="w-full bg-primary text-white rounded-xl py-3 font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          Track Package
        </button>
      </form>
    </div>
  );
}
