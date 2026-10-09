import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle2, MapPin } from 'lucide-react';

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authenticated user session
  const storedUser = localStorage.getItem('thriftloop_user');
  const token = localStorage.getItem('thriftloop_token');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Fallback demo orders for testing map & tracking states
  const sampleOrders = [
    {
      id: 'TL-89421',
      date: 'September 21, 2026',
      total: 1200.0,
      status: 'In Transit',
      courier: 'J&T Express',
      trackingNumber: 'JNT-PH-7729104',
      origin: 'General Trias, Cavite',
      destination: 'Dasmariñas, Cavite',
      estimatedDelivery: 'Tomorrow by 4:00 PM',
      items: [
        {
          name: 'Vintage Floral Midi Dress',
          size: 'M',
          price: 450,
          image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=500&auto=format&fit=crop'
        },
        {
          name: 'Classic Washed Denim Jacket',
          size: 'L',
          price: 750,
          image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=500&auto=format&fit=crop'
        }
      ]
    },
    {
      id: 'TL-84102',
      date: 'September 12, 2026',
      total: 400.0,
      status: 'Delivered',
      courier: 'LBC Express',
      trackingNumber: 'LBC-PH-3301948',
      origin: 'General Trias, Cavite',
      destination: 'Imus, Cavite',
      estimatedDelivery: 'Delivered Sep 14',
      items: [
        {
          name: 'Relaxed Utility Cargo Pants',
          size: '32',
          price: 400,
          image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=500&auto=format&fit=crop'
        }
      ]
    }
  ];

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Pull real orders from MariaDB
    fetch(`http://localhost:5000/api/orders/user/${user?.id || user?.user_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setOrders(data);
          setSelectedOrder(data[0]);
        } else {
          setOrders(sampleOrders);
          setSelectedOrder(sampleOrders[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setOrders(sampleOrders);
        setSelectedOrder(sampleOrders[0]);
        setLoading(false);
      });
  }, [token]);

  const steps = [
    { label: 'Order Confirmed', icon: Package },
    { label: 'Packed & Authenticated', icon: CheckCircle2 },
    { label: 'In Transit', icon: Truck },
    { label: 'Delivered', icon: MapPin }
  ];

  const getStepIndex = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 0;
      case 'processing': return 1;
      case 'in transit': return 2;
      case 'delivered': return 3;
      default: return 2;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans flex flex-col justify-between">
      <main className="max-w-7xl mx-auto px-6 py-10 w-full">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#23313A]">Order Tracking & History</h1>
          <p className="text-xs font-semibold text-[#A8C3A0] mt-1.5">
            Track authenticated 1-of-1 pieces in transit from our Cavite studio to your doorstep.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Orders List */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#23313A]/70 mb-2">
              Your Purchases ({orders.length})
            </h2>

            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white shadow-sm ${
                  selectedOrder?.id === order.id
                    ? 'border-[#2F6B4F] ring-2 ring-[#2F6B4F]/20'
                    : 'border-[#A8C3A0]/30 hover:border-[#2F6B4F]/50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#23313A]">#{order.id}</span>
                    <p className="text-[11px] font-semibold text-[#A8C3A0]">{order.date}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                      order.status === 'Delivered'
                        ? 'bg-[#2F6B4F]/10 text-[#2F6B4F]'
                        : 'bg-[#E67E5F]/15 text-[#E67E5F]'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Thumbnail Items */}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto py-1">
                  {order.items?.map((item, idx) => (
                    <img
                      key={idx}
                      src={item.image || item.image_url}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg border border-[#A8C3A0]/20 bg-[#F6F1E8]"
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#A8C3A0]/20 text-xs">
                  <span className="text-[#A8C3A0] font-semibold">{order.items?.length} Item(s)</span>
                  <span className="font-bold text-[#2F6B4F]">₱{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Transit Status & Google Maps */}
          {selectedOrder && (
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-sm">
                
                {/* Stepper Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8C3A0]">Tracking ID</span>
                    <h3 className="font-mono text-sm font-bold text-[#23313A]">{selectedOrder.trackingNumber}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8C3A0]">Est. Arrival</span>
                    <p className="text-xs font-bold text-[#E67E5F]">{selectedOrder.estimatedDelivery}</p>
                  </div>
                </div>

                {/* Stepper Progress */}
                <div className="relative flex justify-between items-center mb-8 px-2">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#F6F1E8] -translate-y-1/2 z-0" />
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-[#2F6B4F] -translate-y-1/2 z-0 transition-all duration-500" 
                    style={{ width: `${(getStepIndex(selectedOrder.status) / 3) * 100}%` }}
                  />

                  {steps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isComplete = idx <= getStepIndex(selectedOrder.status);
                    const isCurrent = idx === getStepIndex(selectedOrder.status);

                    return (
                      <div key={idx} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            isComplete 
                              ? 'bg-[#2F6B4F] text-white' 
                              : 'bg-white border-2 border-[#A8C3A0]/40 text-[#A8C3A0]'
                          } ${isCurrent ? 'ring-4 ring-[#2F6B4F]/20' : ''}`}
                        >
                          <StepIcon size={16} />
                        </div>
                        <span className={`text-[10px] mt-2 font-bold max-w-[70px] text-center leading-tight ${isComplete ? 'text-[#23313A]' : 'text-[#A8C3A0]'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Google Maps Embed Route */}
                <div className="rounded-2xl overflow-hidden border border-[#A8C3A0]/30 relative bg-[#F6F1E8] mb-6">
                  <div className="p-3 bg-[#23313A] text-white text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#E67E5F]" />
                      <span>Route: {selectedOrder.origin} → {selectedOrder.destination}</span>
                    </div>
                    <span className="text-[10px] text-[#A8C3A0]">{selectedOrder.courier}</span>
                  </div>

                  <iframe
                    title="Shipment Route Map"
                    width="100%"
                    height="280"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${selectedOrder.destination}, Philippines`
                    )}&output=embed`}
                  />
                </div>

                {/* Itemized Contents */}
                <div className="border-t border-[#A8C3A0]/20 pt-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#23313A]">Package Contents</h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || item.image_url}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg border border-[#A8C3A0]/20 bg-[#F6F1E8]"
                          />
                          <div>
                            <p className="font-bold text-[#23313A]">{item.name}</p>
                            <p className="text-[10px] text-[#A8C3A0] font-semibold">Size {item.size}</p>
                          </div>
                        </div>
                        <span className="font-bold text-[#2F6B4F]">₱{Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {/* Simplified Bottom Bar */}
      <footer className="bg-white border-t border-[#A8C3A0]/30 py-6 px-6 text-center text-[11px] font-semibold text-[#A8C3A0]">
        © 2026 ThriftLoop. All rights reserved.
      </footer>
    </div>
  );
}