import React from 'react';

export default function HelpCenter() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold text-textPrimary mb-6">Help Center</h1>
      <p className="text-textSecondary mb-8">How can we help you today?</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface border border-divider rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-textPrimary mb-3">FAQ</h3>
          <p className="text-textSecondary">Find answers to frequently asked questions about orders, shipping, and returns.</p>
        </div>
        <div className="bg-surface border border-divider rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-textPrimary mb-3">Account Issues</h3>
          <p className="text-textSecondary">Trouble logging in or managing your profile? We've got you covered.</p>
        </div>
        <div className="bg-surface border border-divider rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-textPrimary mb-3">Payment Methods</h3>
          <p className="text-textSecondary">Learn about the different payment methods we accept securely.</p>
        </div>
        <div className="bg-surface border border-divider rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-textPrimary mb-3">Digital Products</h3>
          <p className="text-textSecondary">Having trouble accessing your purchased e-books? Find help here.</p>
        </div>
      </div>
    </div>
  );
}
