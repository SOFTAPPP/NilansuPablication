import React from 'react';

export default function Returns() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-4xl font-bold text-textPrimary mb-6">Returns & Exchanges</h1>
      <div className="bg-surface rounded-3xl border border-divider p-8 shadow-sm text-textSecondary leading-relaxed">
        <h3 className="text-2xl font-semibold text-textPrimary mb-4">Our Policy</h3>
        <p className="mb-4">We want you to be completely satisfied with your purchase. If you are not entirely happy, you can return your item(s) within 30 days of delivery for a full refund or exchange.</p>
        <ul className="list-disc pl-6 space-y-2 mb-8">
          <li>Items must be unused and in the same condition that you received them.</li>
          <li>Books must have no visible signs of wear or damage.</li>
          <li>Proof of purchase is required for all returns.</li>
        </ul>
        <h3 className="text-2xl font-semibold text-textPrimary mb-4">How to Return</h3>
        <p>To initiate a return, please contact our support team with your order number and reason for return. We will provide you with a return shipping label and instructions. Once we receive your returned item, we will inspect it and process your refund within 3-5 business days.</p>
      </div>
    </div>
  );
}
