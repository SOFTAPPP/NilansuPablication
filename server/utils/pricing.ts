export interface OrderItem {
  bookId: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentMethod = 'PREPAID' | 'COD';

export interface PricingResult {
  productSubtotal: number;
  shippingCharge: number;
  codCharge: number;
  discount: number; // Placeholder for future if needed
  finalAmount: number;
}

export function calculateOrderTotal(
  items: OrderItem[],
  paymentMethod: PaymentMethod,
  discount: number = 0
): PricingResult {
  const productSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  let shippingCharge = 0;
  let codCharge = 0;

  if (productSubtotal < 499) {
    shippingCharge = 49;
  }

  if (paymentMethod === 'COD') {
    codCharge = 40;
  }

  const finalAmount = productSubtotal + shippingCharge + codCharge - discount;

  return {
    productSubtotal,
    shippingCharge,
    codCharge,
    discount,
    finalAmount: Math.max(0, finalAmount) // Prevent negative totals
  };
}
