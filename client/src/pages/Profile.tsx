import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { User, Package, Calendar, Clock } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const data = await api.getMyOrders();
        setOrders(data);
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-textPrimary">My Profile</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Details Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-surface border border-divider rounded-xl p-6 shadow-sm">
              <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <User size={40} />
                </div>
                <h2 className="text-xl font-bold text-textPrimary text-center">{user.name}</h2>
                <p className="text-textSecondary text-sm text-center">{user.email}</p>
                <span className="mt-2 inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase">
                  {user.role}
                </span>
              </div>
              
              <div className="border-t border-divider pt-6 space-y-3">
                <button 
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="w-full btn-secondary text-danger hover:bg-danger/5 border-danger/20"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>

          {/* Orders Section */}
          <div className="md:col-span-2">
            <div className="bg-surface border border-divider rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Package className="text-primary" />
                Order History
              </h2>

              {isLoading ? (
                <div className="text-center py-8 text-textSecondary">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-divider rounded-xl">
                  <Package className="mx-auto text-textSecondary mb-3 opacity-50" size={48} />
                  <p className="text-textSecondary">You haven't placed any orders yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="border border-divider rounded-xl p-4 hover:border-primary/50 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <div>
                          <p className="font-bold text-textPrimary">Order #{order.orderNumber}</p>
                          <p className="text-sm text-textSecondary flex items-center gap-1 mt-1">
                            <Calendar size={14} />
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                            <span className="mx-2">•</span>
                            <Clock size={14} />
                            {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">₹{order.finalAmount || order.total || 0}</p>
                          <div className="mt-1 flex flex-col items-end gap-1">
                            {order.paymentMethod === 'COD' ? (
                              <span className="bg-orange-500/10 text-orange-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">COD</span>
                            ) : (
                              <span className="bg-blue-500/10 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">PREPAID</span>
                            )}
                            <span className="bg-secondary text-textPrimary text-xs font-medium px-2 py-1 rounded">
                              {order.orderStatus || order.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {order.shiprocketAwbCode && (
                        <div className="bg-primary/5 p-3 rounded-lg mb-4 flex justify-between items-center text-sm">
                          <div>
                            <span className="text-textSecondary mr-2">Tracking AWB:</span>
                            <span className="font-mono font-bold text-primary">{order.shiprocketAwbCode}</span>
                          </div>
                          {order.shiprocketStatus && (
                            <span className="font-medium text-textPrimary text-xs border border-primary/20 bg-surface px-2 py-1 rounded">{order.shiprocketStatus}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="border-t border-divider pt-4">
                        <p className="text-sm font-medium mb-2">Items:</p>
                        <div className="space-y-3 mt-4">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm text-textSecondary bg-muted/30 p-2 rounded-lg">
                              <div className="flex items-center gap-3">
                                {item.book?.coverImage ? (
                                  <img 
                                    src={item.book.coverImage?.includes('uploaded_books') ? `${item.book.coverImage}?w=100` : item.book.coverImage} 
                                    alt={item.book.title} 
                                    className="w-10 h-14 object-cover rounded shadow-sm"
                                  />
                                ) : (
                                  <div className="w-10 h-14 bg-divider rounded flex items-center justify-center shrink-0">
                                    <Package size={16} className="text-textSecondary/50" />
                                  </div>
                                )}
                                <span className="font-medium text-textPrimary">{item.quantity}x {item.book?.title || 'Unknown Book'}</span>
                              </div>
                              <span className="font-bold text-textPrimary">₹{(item.unitPrice || 0) * (item.quantity || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
