import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export default function Checkout() {
  const { state: { items }, cartTotal, dispatch } = useCart();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pinCode: ''
  });

  const [paymentMethod, setPaymentMethod] = useState<'PREPAID' | 'COD'>('PREPAID');

  let shippingCharge = 0;
  let codCharge = 0;

  if (cartTotal < 499) {
    shippingCharge = 49;
  }
  if (paymentMethod === 'COD') {
    codCharge = 40;
  }

  const grandTotal = cartTotal + shippingCharge + codCharge - discount;

  const handleApplyCoupon = () => {
    if (coupon.toLowerCase() === 'welcome20') {
      setDiscount(Math.floor(cartTotal * 0.2));
      setCouponMessage('20% discount applied!');
    } else {
      setDiscount(0);
      setCouponMessage('Invalid coupon code.');
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      const orderData = {
        ...formData,
        discount,
        items: items.map((item: any) => ({
          bookId: item.bookId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      };
      
      if (paymentMethod === 'COD') {
        const response = await api.createCodOrder(orderData);
        dispatch({ type: 'CLEAR_CART' });
        navigate(`/payment/success?orderId=${response.orderNumber}`);
        return;
      }
      
      const res = await loadRazorpayScript();
      if (!res) {
        showToast("Razorpay SDK failed to load. Are you online?", "error");
        setIsSubmitting(false);
        return;
      }

      const response = await api.createRazorpayOrder(orderData);
      
      const options = {
        key: response.keyId,
        amount: response.amount,
        currency: response.currency,
        name: "Nilansu Publication",
        description: "Book Purchase",
        order_id: response.orderId,
        handler: async function (paymentResponse: any) {
          try {
            await api.verifyRazorpayPayment({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              orderNumber: response.orderNumber,
              orderData: orderData
            });
            dispatch({ type: 'CLEAR_CART' });
            navigate(`/payment/success?orderId=${response.orderNumber}`);
          } catch (err: any) {
            navigate(`/payment/failed?orderId=${response.orderNumber}&reason=verification_failed`);
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: "#3B82F6" },
        modal: {
          ondismiss: function () {
            setIsPaymentOpen(false);
            navigate(`/payment/failed?reason=cancelled&orderId=${response.orderNumber}`, { replace: true });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        showToast('Payment attempt failed. Please select another payment method.', 'error');
      });
      rzp.open();
      setIsPaymentOpen(true);

    } catch (err: any) {
      console.error(err);
      showToast('Currently technical error is happening. Please try again after 30 minutes.', 'error');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (items.length === 0 && !isSubmitting && !isPaymentOpen) {
      navigate('/cart');
    }
  }, [items.length, isSubmitting, isPaymentOpen, navigate]);

  if (items.length === 0 && !isSubmitting && !isPaymentOpen) {
    return null;
  }

  if (isPaymentOpen) {
    return (
      <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-textPrimary mb-2">Processing Payment...</h2>
        <p className="text-textSecondary">Please complete the payment in the Razorpay window.</p>
        <p className="text-textSecondary text-sm mt-2">Do not close or refresh this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-textPrimary mb-8">Checkout</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:col-span-2">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8 bg-surface p-6 rounded-2xl border border-divider shadow-sm">
            
            {/* User Details */}
            <div>
              <h2 className="text-xl font-bold mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Full Name</label>
                  <input type="text" required className="input-field" placeholder="John Doe" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
                  <input type="email" required className="input-field" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Phone Number</label>
                  <input type="tel" required className="input-field" placeholder="+91 9876543210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Shipping Details */}
            <div>
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-textSecondary mb-1">Street Address</label>
                  <input type="text" required className="input-field" placeholder="123 Main St, Apt 4B" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">City</label>
                  <input type="text" required className="input-field" placeholder="Mumbai" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">State</label>
                  <input type="text" required className="input-field" placeholder="Maharashtra" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">PIN Code</label>
                  <input type="text" required className="input-field" placeholder="400001" value={formData.pinCode} onChange={e => setFormData({...formData, pinCode: e.target.value})} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-textPrimary mb-4">Payment Method</h3>
              <div className="space-y-3">
                <label className={`block border p-4 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'PREPAID' ? 'bg-primary/5 border-primary' : 'bg-muted border-divider'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="paymentMethod" value="PREPAID" checked={paymentMethod === 'PREPAID'} onChange={() => setPaymentMethod('PREPAID')} className="text-primary focus:ring-primary w-4 h-4" />
                      <div>
                        <h4 className="font-medium text-textPrimary text-sm">Online Payment (Razorpay)</h4>
                        <p className="text-xs text-textSecondary">Credit Card, UPI, Net Banking, Wallets</p>
                      </div>
                    </div>
                    <span className="text-xs bg-primary text-white px-2 py-1 rounded">Secure</span>
                  </div>
                </label>
                <label className={`block border p-4 rounded-xl cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'bg-primary/5 border-primary' : 'bg-muted border-divider'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="text-primary focus:ring-primary w-4 h-4" />
                    <div>
                      <h4 className="font-medium text-textPrimary text-sm">Cash on Delivery</h4>
                      <p className="text-xs text-textSecondary">Pay when the order is delivered (+₹40 charge)</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
          </form>
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-2xl border border-divider p-6 shadow-sm sticky top-24">
            <h3 className="text-xl font-bold text-textPrimary mb-6">Review Order</h3>
            
            <div className="space-y-4 mb-6">
              {items.map(item => (
                <div key={item.bookId} className="flex gap-4">
                  <img src={item.coverImage?.includes('uploaded_books') ? `${item.coverImage}?w=100` : item.coverImage} className="w-12 h-16 object-cover rounded bg-muted" alt={item.title} />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-textSecondary">Qty: {item.quantity}</p>
                    <p className="text-sm font-semibold mt-1">₹{item.unitPrice * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mb-6">
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  placeholder="Coupon (e.g., WELCOME20)" 
                  className="input-field text-sm"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <button type="button" onClick={handleApplyCoupon} className="btn-secondary py-2 px-4 text-sm">Apply</button>
              </div>
              {couponMessage && (
                <p className={`text-xs ${discount > 0 ? 'text-success' : 'text-danger'}`}>{couponMessage}</p>
              )}
            </div>
            
            <div className="border-t border-divider pt-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between text-textSecondary">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-textSecondary">
                <span>Shipping</span>
                <span>{shippingCharge === 0 ? 'Free' : `₹${shippingCharge}`}</span>
              </div>
              {paymentMethod === 'COD' && (
                <div className="flex justify-between text-textSecondary">
                  <span>COD Charge</span>
                  <span>₹{codCharge}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-textPrimary pt-2 border-t border-divider mt-2">
                <span>Total to Pay</span>
                <span className="text-primary">₹{grandTotal}</span>
              </div>
            </div>

            <button 
              type="submit" 
              form="checkout-form"
              className="btn-primary w-full py-3 relative disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Opening Secure Payment...
                </span>
              ) : (
                "Confirm Order"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
