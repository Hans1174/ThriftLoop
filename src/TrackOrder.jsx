import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, Truck, Package, MapPin, ArrowLeft, 
  Clock, Copy, Check, ShieldCheck, AlertCircle, 
  Loader2, CheckCircle2, Navigation, ExternalLink, Compass 
} from 'lucide-react';

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(id && id !== '0' ? id : '');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Active tracking order state
  const [trackingData, setTrackingData] = useState({
    order_id: id && id !== '0' ? id : '4',
    tracking_number: 'JNT-89241029',
    courier: 'J&T Express',
    status: 'shipped', // 'pending' | 'processing' | 'shipped' | 'delivered'
    shipping_address: 'B9 L20 Beryl St. TEP, PH2 Tierra Nevada',
    city: 'General Trias',
    province: 'Cavite',
    customer_name: 'Hans Castro',
    total_amount: 830,
  });

  const fetchLiveOrder = async (orderId) => {
    if (!orderId) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/track/${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Order tracking details not found.');
      }

      setTrackingData(data);
    } catch (err) {
      if (String(orderId) === '4') {
        setTrackingData({
          order_id: '4',
          tracking_number: 'JNT-89241029',
          courier: 'J&T Express',
          status: 'shipped',
          shipping_address: 'B9 L20 Beryl St. TEP, PH2 Tierra Nevada',
          city: 'General Trias',
          province: 'Cavite',
          customer_name: 'Hans Castro',
          total_amount: 830,
        });
      } else {
        setError(err.message || 'No tracking information found for this ID.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && id !== '0') {
      setSearchInput(id);
      fetchLiveOrder(id);
    }
  }, [id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/track/${searchInput.trim()}`);
    fetchLiveOrder(searchInput.trim());
  };

  const handleCopyTracking = () => {
    if (!trackingData?.tracking_number) return;
    navigator.clipboard.writeText(trackingData.tracking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Milestone mapping
  const milestones = [
    { title: 'Order Confirmed', detail: 'Vintage pieces reserved & authenticated', key: 'pending' },
    { title: 'Packed & Dispatched', detail: 'Package received by courier sorting hub', key: 'processing' },
    { title: 'In Transit', detail: 'On route via courier delivery hub', key: 'shipped' },
    { title: 'Delivered', detail: 'Successfully received by recipient', key: 'delivered' },
  ];

  const getStepIndex = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 0;
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const currentStep = getStepIndex(trackingData?.status);

  // Logistics Route Coordinates & Address Formatter
  const originAddress = 'General Trias, Cavite, Philippines';
  const destinationAddress = [
    trackingData?.shipping_address,
    trackingData?.city,
    trackingData?.province,
    'Philippines'
  ].filter(Boolean).join(', ');

  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const mapEmbedUrl = googleMapsKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${googleMapsKey}&origin=${encodeURIComponent(originAddress)}&destination=${encodeURIComponent(destinationAddress)}&mode=driving`
    : `https://maps.google.com/maps?q=${encodeURIComponent(destinationAddress)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const externalMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originAddress)}&destination=${encodeURIComponent(destinationAddress)}&travelmode=driving`;

  const getLogisticsCheckpoint = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          location: 'ThriftLoop Central Archive Hub (General Trias, Cavite)',
          eta: 'Pending Packaging & Sanitization',
          phase: 'Origin Facility',
        };
      case 'processing':
        return {
          location: 'Cavite Regional Sorting Hub',
          eta: 'Ready for Courier Hand-off',
          phase: 'Dispatch Facility',
        };
      case 'shipped':
        return {
          location: `En Route via ${trackingData?.courier || 'Courier'} Delivery Unit`,
          eta: trackingData?.courier === 'Lalamove' ? 'Same-Day (Expected within hours)' : '1 - 2 Business Days',
          phase: 'Active Highway Transit',
        };
      case 'delivered':
        return {
          location: destinationAddress,
          eta: 'Completed Delivery',
          phase: 'Package Delivered',
        };
      default:
        return {
          location: 'ThriftLoop Central Hub (Cavite)',
          eta: 'In Preparation',
          phase: 'Initial Sorting',
        };
    }
  };

  const checkpoint = getLogisticsCheckpoint(trackingData?.status);

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16 py-8 sm:py-12 px-4 sm:px-6">
      <main className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-[#A8C3A0]/20">
          <Link
            to="/orders"
            className="flex items-center gap-1.5 text-xs font-bold text-[#23313A]/70 hover:text-[#2F6B4F] transition-colors group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to My Orders</span>
          </Link>

          <span className="text-[11px] font-bold text-[#A8C3A0] uppercase tracking-wider">
            Live Logistics Service
          </span>
        </div>

        {/* Page Title */}
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] tracking-tight">
            Track Shipment
          </h1>
          <p className="text-xs text-[#A8C3A0] font-semibold mt-1">
            Real-time courier milestones and geographic route tracking for your vintage pieces.
          </p>
        </div>

        {/* Search Order Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-3.5 text-[#A8C3A0]" />
            <input
              type="text"
              placeholder="Enter Order ID (e.g. 4) or Tracking Number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white border border-[#A8C3A0]/40 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#2F6B4F] text-[#23313A] shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchInput.trim()}
            className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Track'}
          </button>
        </form>

        {error && (
          <div className="bg-[#E67E5F]/10 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-4 rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Courier Overview Card */}
        {trackingData && (
          <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xs animate-in fade-in duration-300">
            
            {/* Top Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-[#A8C3A0]/20 pb-6 text-xs">
              <div>
                <span className="text-[#A8C3A0] text-[10px] uppercase font-bold block">
                  Order ID
                </span>
                <span className="font-mono font-bold text-base text-[#23313A]">
                  #{trackingData.order_id}
                </span>
              </div>

              <div>
                <span className="text-[#A8C3A0] text-[10px] uppercase font-bold block">
                  Courier Provider
                </span>
                <span className="font-bold text-[#23313A] flex items-center gap-1.5 mt-1">
                  <Truck size={14} className="text-[#2F6B4F]" /> 
                  <span>{trackingData.courier || 'J&T Express'}</span>
                </span>
              </div>

              <div>
                <span className="text-[#A8C3A0] text-[10px] uppercase font-bold block">
                  Tracking Code
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-mono font-bold text-xs text-[#2F6B4F]">
                    {trackingData.tracking_number || 'Pending Assignment'}
                  </span>
                  {trackingData.tracking_number && (
                    <button
                      type="button"
                      onClick={handleCopyTracking}
                      className="text-[#A8C3A0] hover:text-[#23313A] transition-colors p-0.5 cursor-pointer"
                      title="Copy Tracking Number"
                    >
                      {copied ? <Check size={13} className="text-[#2F6B4F]" /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[#A8C3A0] text-[10px] uppercase font-bold block">
                  Current Status
                </span>
                <span className="inline-block mt-1 bg-[#2F6B4F]/15 text-[#2F6B4F] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {trackingData.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-6">
              <h2 className="font-serif font-bold text-lg text-[#23313A]">Shipment Progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 sm:gap-2">
                {milestones.map((m, idx) => {
                  const isPassed = idx < currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={idx} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 text-left sm:text-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                          isPassed || isCurrent
                            ? 'bg-[#2F6B4F] text-white shadow-xs'
                            : 'bg-[#F6F1E8] border border-[#A8C3A0]/30 text-[#A8C3A0]'
                        } ${isCurrent ? 'ring-4 ring-[#2F6B4F]/20' : ''}`}
                      >
                        {isPassed ? (
                          <CheckCircle2 size={18} className="stroke-[2.5]" />
                        ) : isCurrent ? (
                          <Clock size={16} className="animate-pulse" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isPassed || isCurrent ? 'text-[#23313A]' : 'text-[#23313A]/40'}`}>
                          {m.title}
                        </p>
                        <p className="text-[10px] text-[#A8C3A0] font-medium mt-0.5 leading-tight max-w-[150px]">
                          {m.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Google Maps Visual Logistics Route */}
            <div className="border-t border-[#A8C3A0]/20 pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif font-bold text-lg text-[#23313A] flex items-center gap-2">
                    <Navigation size={18} className="text-[#2F6B4F]" />
                    <span>Visual Logistics Route</span>
                  </h2>
                  <p className="text-[11px] text-[#A8C3A0] font-medium">
                    Automated route telemetry from ThriftLoop Hub to your delivery point
                  </p>
                </div>

                <a
                  href={externalMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6B4F] hover:text-[#23313A] transition-colors"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Transit Telemetry Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F6F1E8]/50 border border-[#A8C3A0]/30 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Transit Phase</span>
                  <span className="font-bold text-[#23313A] flex items-center gap-1 mt-0.5">
                    <Compass size={13} className="text-[#2F6B4F]" />
                    {checkpoint.phase}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Current Checkpoint</span>
                  <span className="font-bold text-[#23313A] truncate block mt-0.5" title={checkpoint.location}>
                    {checkpoint.location}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Estimated Arrival</span>
                  <span className="font-bold text-[#2F6B4F] block mt-0.5">
                    {checkpoint.eta}
                  </span>
                </div>
              </div>

              {/* Embedded Map Canvas */}
              <div className="w-full h-80 rounded-2xl overflow-hidden border border-[#A8C3A0]/30 shadow-xs relative bg-[#F6F1E8]">
                <iframe
                  title="Parcel Transit Route"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapEmbedUrl}
                />
              </div>
            </div>

            {/* Delivery Destination & Details */}
            <div className="border-t border-[#A8C3A0]/20 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1.5">
                <p className="font-bold text-[#23313A] flex items-center gap-1.5">
                  <MapPin size={15} className="text-[#2F6B4F]" /> 
                  <span>Destination Address</span>
                </p>
                {trackingData.customer_name && (
                  <p className="text-[#23313A]/80 font-bold">{trackingData.customer_name}</p>
                )}
                <p className="text-[#23313A]/60 leading-relaxed">
                  {destinationAddress}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-[#23313A] flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-[#2F6B4F]" /> 
                  <span>Package Security</span>
                </p>
                <p className="text-[#23313A]/60 leading-relaxed">
                  All garments in this delivery are tamper-sealed and verified authentic 1-of-1 vintage pieces.
                </p>
                {trackingData.total_amount && (
                  <p className="font-bold text-[#2F6B4F] pt-1">
                    Total Order Value: ₱{Number(trackingData.total_amount).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}