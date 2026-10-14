import { API_URL } from './config';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Search, Truck, Package, MapPin, ArrowLeft, 
  Clock, Copy, Check, ShieldCheck, AlertCircle, 
  Loader2, CheckCircle2, Navigation, ExternalLink, Compass,
  ShoppingBag, Tag, CreditCard
} from 'lucide-react';

const BACKEND_URL = API_URL || import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

// Strategic Logistics Hubs & Telemetry
const LOGISTICS_HUBS = {
  hub: { lat: 14.3294, lng: 120.9367, name: 'ThriftLoop Central Archive Hub (Dasmariñas)' },
  sorting: { lat: 14.3450, lng: 120.9380, name: 'J&T Express Regional Sorting Hub' },
};

// Comprehensive Geo-Coordinates Mapping for Cavite, NCR & Calabarzon
const CITY_COORDINATES = {
  // Cavite
  'tanza': [14.3938, 120.8540],
  'general trias': [14.3873, 120.8814],
  'gen trias': [14.3873, 120.8814],
  'gentri': [14.3873, 120.8814],
  'dasmariñas': [14.3294, 120.9367],
  'dasmarinas': [14.3294, 120.9367],
  'dasma': [14.3294, 120.9367],
  'imus': [14.4297, 120.9367],
  'bacoor': [14.4600, 120.9400],
  'trece martires': [14.2828, 120.8667],
  'trece': [14.2828, 120.8667],
  'kawit': [14.4447, 120.9036],
  'noveleta': [14.4278, 120.8803],
  'cavite city': [14.4833, 120.9000],
  'rosario': [14.4150, 120.8578],
  'naic': [14.3167, 120.7667],
  'silang': [14.2307, 120.9748],
  'tagaytay': [14.1153, 120.9621],
  'maragondon': [14.2750, 120.7333],
  'ternate': [14.2889, 120.7167],
  'indang': [14.1950, 120.8767],
  'alfonso': [14.1417, 120.8533],
  'amadeo': [14.1706, 120.9239],
  'mendez': [14.1306, 120.9056],
  'carmona': [14.3150, 121.0583],
  'general mariano alvarez': [14.3000, 121.0000],
  'gma': [14.3000, 121.0000],
  'magallanes': [14.1889, 120.7389],
  'bailen': [14.1833, 120.8000],

  // Metro Manila (NCR)
  'manila': [14.5995, 120.9842],
  'quezon city': [14.6760, 121.0437],
  'makati': [14.5547, 121.0244],
  'taguig': [14.5176, 121.0509],
  'pasig': [14.5764, 121.0851],
  'parañaque': [14.4793, 121.0198],
  'paranaque': [14.4793, 121.0198],
  'las piñas': [14.4445, 120.9939],
  'las pinas': [14.4445, 120.9939],
  'muntinlupa': [14.4081, 121.0415],
  'pasay': [14.5378, 121.0014],
  'mandaluyong': [14.5794, 121.0359],
  'san juan': [14.6019, 121.0355],
  'caloocan': [14.6416, 120.9762],
  'malabon': [14.6625, 120.9572],
  'navotas': [14.6667, 120.9417],
  'valenzuela': [14.7011, 120.9830],
  'marikina': [14.6507, 121.1029],

  // Laguna
  'san pedro': [14.3583, 121.0583],
  'biñan': [14.3392, 121.0805],
  'binan': [14.3392, 121.0805],
  'santa rosa': [14.3122, 121.1114],
  'cabuyao': [14.2783, 121.1250],
  'calamba': [14.2144, 121.1656],
  'los baños': [14.1814, 121.2408],
  'san pablo': [14.0678, 121.3253],

  // Batangas
  'batangas city': [13.7565, 121.0583],
  'lipa': [13.9419, 121.1644],
  'tanauan': [14.0864, 121.1500],
  'santo tomas': [14.1089, 121.1417],
  'nasugbu': [14.0767, 120.6339],

  // Rizal
  'antipolo': [14.5842, 121.1763],
  'cainta': [14.5778, 121.1222],
  'taytay': [14.5683, 121.1328],
  'san mateo': [14.6961, 121.1219],
};

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState(id && id !== '0' ? id : '');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Active tracking order state
  const [trackingData, setTrackingData] = useState(null);

  const fetchLiveOrder = async (orderId) => {
    if (!orderId) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/track/${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Order tracking details not found.');
      }

      setTrackingData(data);
    } catch (err) {
      setError(`Order #${orderId} was not found. Please verify your order number or tracking code.`);
      setTrackingData({
        order_id: orderId,
        tracking_number: 'JNT-52438668',
        courier: 'J&T Express',
        status: 'pending',
        shipping_address: 'Tanza, Cavite',
        city: 'Tanza',
        province: 'Cavite',
        postal_code: '4108',
        customer_name: 'Customer',
        payment_method: 'PayMongo',
        subtotal: 200,
        shipping_fee: 80,
        discount_amount: 0,
        total_amount: 280,
        order_items: [
          {
            price_at_purchase: 200,
            quantity: 1,
            products: {
              name: 'Vintage Cargo Pants',
              size: '30',
              condition_grade: 'Used but not abused',
              image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=300'
            }
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && id !== '0') {
      setSearchInput(id);
      fetchLiveOrder(id);
    } else {
      fetchLiveOrder('20');
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

  // Dynamically resolve exact coordinates based on customer city or street
  const getDestinationCoords = (data) => {
    const city = (data?.city || '').toLowerCase().trim();
    const address = (data?.shipping_address || '').toLowerCase().trim();
    const combined = `${city} ${address}`;

    // 1. Direct or substring matching against known city database
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (city.includes(key) || combined.includes(key)) {
        return coords;
      }
    }

    // 2. Province-level fallbacks
    const province = (data?.province || '').toLowerCase();
    if (province.includes('metro manila') || province.includes('ncr')) return CITY_COORDINATES['manila'];
    if (province.includes('laguna')) return CITY_COORDINATES['calamba'];
    if (province.includes('batangas')) return CITY_COORDINATES['batangas city'];
    if (province.includes('rizal')) return CITY_COORDINATES['antipolo'];

    // 3. Fallback to Tanza / General Trias boundary
    return [14.3938, 120.8540];
  };

  const originAddress = 'Dasmariñas, Cavite, Philippines';
  const destinationAddress = [
    trackingData?.shipping_address,
    trackingData?.city,
    trackingData?.province,
    trackingData?.postal_code,
    'Philippines'
  ].filter(Boolean).join(', ');

  const externalMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originAddress)}&destination=${encodeURIComponent(destinationAddress)}&travelmode=driving`;

  const getLogisticsCheckpoint = (status) => {
    const destName = trackingData?.city || 'Delivery Destination';
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          location: 'ThriftLoop Central Archive Hub (Dasmariñas, Cavite)',
          eta: 'Packaging & Fabric Sanitization',
          phase: 'Origin Facility',
        };
      case 'processing':
        return {
          location: 'Cavite Regional Sorting Hub (Governor\'s Drive)',
          eta: 'Ready for Courier Hand-off',
          phase: 'Dispatch Facility',
        };
      case 'shipped':
        return {
          location: `En Route to ${destName} via ${trackingData?.courier || 'Courier'} Delivery Unit`,
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
  const items = trackingData?.order_items || trackingData?.items || [];

  // Load Leaflet CDN dynamically
  useEffect(() => {
    if (window.L) {
      setMapReady(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setMapReady(true);
      document.body.appendChild(script);
    } else {
      const poll = setInterval(() => {
        if (window.L) {
          clearInterval(poll);
          setMapReady(true);
        }
      }, 100);
      return () => clearInterval(poll);
    }
  }, []);

  // Render Leaflet Map with Dynamic Coordinates
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || !window.L || !trackingData) return;

    const L = window.L;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const originCoords = [LOGISTICS_HUBS.hub.lat, LOGISTICS_HUBS.hub.lng];
    const destCoords = getDestinationCoords(trackingData);

    // Dynamic Waypoint Interpolation along the route to destination
    let courierCoords = originCoords;
    if (currentStep === 1) {
      // 30% progress along the delivery vector
      courierCoords = [
        originCoords[0] + (destCoords[0] - originCoords[0]) * 0.30,
        originCoords[1] + (destCoords[1] - originCoords[1]) * 0.30,
      ];
    } else if (currentStep === 2) {
      // 70% progress along the delivery vector
      courierCoords = [
        originCoords[0] + (destCoords[0] - originCoords[0]) * 0.70,
        originCoords[1] + (destCoords[1] - originCoords[1]) * 0.70,
      ];
    } else if (currentStep === 3) {
      courierCoords = destCoords;
    }

    const map = L.map(mapContainerRef.current, {
      center: courierCoords,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Placemarker 1: Central Fulfillment Hub
    const hubIcon = L.divIcon({
      className: 'custom-hub-pin',
      html: `
        <div style="background-color:#2F6B4F; color:#ffffff; width:34px; height:34px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; font-size:16px;">
          🏬
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const hubMarker = L.marker(originCoords, { icon: hubIcon }).addTo(map);
    hubMarker.bindPopup(`
      <div style="font-family:sans-serif; font-size:12px; padding:2px;">
        <strong style="color:#2F6B4F;">🏬 ThriftLoop Central Archive</strong>
        <p style="margin:3px 0 0 0; color:#555;">Dasmariñas Logistics Base • Origin Facility</p>
      </div>
    `);

    // Placemarker 2: Live Courier Unit
    const courierIcon = L.divIcon({
      className: 'custom-courier-pin',
      html: `
        <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; inset:0; border-radius:50%; background:#E67E5F; opacity:0.4; transform:scale(1.3); animation:pulse 1.8s infinite ease-out;"></div>
          <div style="background-color:#E67E5F; color:#ffffff; width:36px; height:36px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; font-size:16px; z-index:2;">
            🚚
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const courierMarker = L.marker(courierCoords, { icon: courierIcon }).addTo(map);
    courierMarker.bindPopup(`
      <div style="font-family:sans-serif; font-size:12px; padding:2px;">
        <strong style="color:#E67E5F;">📍 CURRENT PACKAGE LOCATION</strong>
        <p style="margin:3px 0 0 0; font-weight:bold; color:#23313A;">${trackingData?.courier || 'J&T Express'} Delivery Unit</p>
        <p style="margin:2px 0 0 0; color:#666;">Status: ${(trackingData?.status || 'In Transit').toUpperCase()}</p>
        <p style="margin:2px 0 0 0; color:#2F6B4F; font-weight:bold;">ETA: ${checkpoint.eta}</p>
      </div>
    `).openPopup();

    // Placemarker 3: Destination Pin (Accurately Placed on Buyer City)
    const destIcon = L.divIcon({
      className: 'custom-dest-pin',
      html: `
        <div style="background-color:#23313A; color:#ffffff; width:34px; height:34px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; font-size:16px;">
          📍
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });

    const destMarker = L.marker(destCoords, { icon: destIcon }).addTo(map);
    destMarker.bindPopup(`
      <div style="font-family:sans-serif; font-size:12px; padding:2px;">
        <strong style="color:#23313A;">🏡 Delivery Destination (${trackingData?.city || 'Customer'})</strong>
        <p style="margin:3px 0 0 0; color:#555;">${trackingData?.customer_name || 'Customer'}</p>
        <p style="margin:2px 0 0 0; color:#777; font-size:11px;">${destinationAddress}</p>
      </div>
    `);

    // Route Polyline Connecting Origin -> Courier -> Real Destination
    L.polyline([originCoords, courierCoords, destCoords], {
      color: '#2F6B4F',
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.8,
    }).addTo(map);

    const group = L.featureGroup([hubMarker, courierMarker, destMarker]);
    map.fitBounds(group.getBounds().pad(0.25));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapReady, trackingData, currentStep]);

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans pb-16 py-6 sm:py-10 px-4 sm:px-8">
      <main className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-[#A8C3A0]/20">
          <Link
            to="/orders"
            className="flex items-center gap-1.5 text-xs font-bold text-[#23313A]/70 hover:text-[#2F6B4F] transition-colors group cursor-pointer"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to My Orders</span>
          </Link>

          <span className="text-[10px] sm:text-[11px] font-bold text-[#A8C3A0] uppercase tracking-wider">
            Live Logistics Service
          </span>
        </div>

        {/* Page Title & Search Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#23313A] tracking-tight">
              Track Shipment
            </h1>
            <p className="text-xs sm:text-sm text-[#A8C3A0] font-semibold mt-1">
              Real-time courier milestones, live route telemetry, and itemized piece status.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto md:min-w-[360px]">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8C3A0]" />
              <input
                type="text"
                inputMode="text"
                placeholder="Enter Order ID (e.g. 20)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-white border border-[#A8C3A0]/40 rounded-2xl pl-10 pr-4 py-2.5 sm:py-2 text-[16px] sm:text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] shadow-xs transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="bg-[#2F6B4F] hover:bg-[#23313A] disabled:opacity-40 text-white px-5 sm:px-6 py-2.5 sm:py-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 min-h-[42px] sm:min-h-[38px]"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Track'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-[#E67E5F]/10 border border-[#E67E5F]/30 text-[#E67E5F] text-xs p-4 rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Layout */}
        {trackingData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (7 cols): Stepper, Live Route Map & Destination */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Stepper Card */}
              <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
                
                {/* Status Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pb-5 border-b border-[#A8C3A0]/20 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">ORDER ID</span>
                    <span className="font-mono font-bold text-sm sm:text-base text-[#23313A]">
                      #{trackingData.order_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">COURIER PROVIDER</span>
                    <span className="font-bold text-[#23313A] flex items-center gap-1 mt-0.5">
                      <Truck size={13} className="text-[#2F6B4F]" />
                      <span>{trackingData.courier || 'J&T Express'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">TRACKING CODE</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono font-bold text-xs text-[#2F6B4F]">
                        {trackingData.tracking_number || 'Pending'}
                      </span>
                      {trackingData.tracking_number && (
                        <button
                          type="button"
                          onClick={handleCopyTracking}
                          className="text-[#A8C3A0] hover:text-[#23313A] p-0.5 cursor-pointer"
                          title="Copy tracking code"
                        >
                          {copied ? <Check size={12} className="text-[#2F6B4F]" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">CURRENT STATUS</span>
                    <span className="inline-block mt-0.5 bg-[#2F6B4F]/10 text-[#2F6B4F] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {trackingData.status || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Milestones Stepper */}
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#23313A] mb-4">
                    Shipment Progress
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
                    {milestones.map((m, idx) => {
                      const isPassed = idx < currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={idx} className="flex flex-col items-center text-center space-y-1.5">
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
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
                            <p className={`text-xs font-bold leading-tight ${isPassed || isCurrent ? 'text-[#23313A]' : 'text-[#23313A]/40'}`}>
                              {m.title}
                            </p>
                            <p className="text-[10px] text-[#A8C3A0] font-medium mt-0.5 leading-snug">
                              {m.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Live Interactive Map Card */}
              <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#23313A] flex items-center gap-2">
                      <Navigation size={17} className="text-[#2F6B4F]" />
                      <span>Visual Logistics Route</span>
                    </h3>
                    <p className="text-[11px] text-[#A8C3A0] font-semibold">
                      Automated telemetry to {trackingData.city || 'Destination'}
                    </p>
                  </div>

                  <a
                    href={externalMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2F6B4F] hover:underline"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Telemetry Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-[#F6F1E8]/50 border border-[#A8C3A0]/30 rounded-2xl text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#A8C3A0] block">Transit Phase</span>
                    <span className="font-bold text-[#23313A] flex items-center gap-1 mt-0.5">
                      <Compass size={12} className="text-[#2F6B4F]" />
                      {checkpoint.phase}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#A8C3A0] block">Current Checkpoint</span>
                    <span className="font-bold text-[#23313A] truncate block mt-0.5" title={checkpoint.location}>
                      {checkpoint.location}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#A8C3A0] block">Estimated Arrival</span>
                    <span className="font-bold text-[#2F6B4F] block mt-0.5">
                      {checkpoint.eta}
                    </span>
                  </div>
                </div>

                {/* Interactive Leaflet Canvas */}
                <div className="w-full h-72 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-[#A8C3A0]/30 shadow-inner relative bg-[#F6F1E8]">
                  <div ref={mapContainerRef} className="w-full h-full" />
                  
                  {/* Legend Overlay */}
                  <div className="absolute bottom-2 left-2 z-[400] bg-white/95 backdrop-blur-sm border border-[#A8C3A0]/30 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-3 text-[10px] font-bold text-[#23313A]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2F6B4F]"></span> Hub (Dasma)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E67E5F] animate-pulse"></span> Package (Live)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#23313A]"></span> Destination ({trackingData.city || 'Tanza'})
                    </span>
                  </div>
                </div>

              </div>

              {/* Delivery Destination & Security Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#A8C3A0] flex items-center gap-1">
                    <MapPin size={13} className="text-[#2F6B4F]" />
                    <span>Destination Address</span>
                  </span>
                  {trackingData.customer_name && (
                    <p className="font-bold text-sm text-[#23313A]">{trackingData.customer_name}</p>
                  )}
                  <p className="text-[#23313A]/70 leading-relaxed text-[11px]">
                    {destinationAddress}
                  </p>
                </div>

                <div className="bg-[#F6F1E8]/60 border border-[#A8C3A0]/30 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#A8C3A0] flex items-center gap-1">
                    <ShieldCheck size={14} className="text-[#2F6B4F]" />
                    <span>Tamper-Sealed Delivery</span>
                  </span>
                  <p className="text-[#23313A]/70 leading-relaxed text-[11px] pt-0.5">
                    Every garment is verified authentic 1-of-1 vintage, physically sanitized, and protected under ThriftLoop dispatch insurance.
                  </p>
                </div>
              </div>

            </div>

            {/* Right Column (5 cols): Itemized Product Details & Billing Overview */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
              
              <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                
                {/* Header */}
                <div className="pb-3 border-b border-[#A8C3A0]/15 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-bold text-[#23313A]">
                      Purchased Pieces
                    </h3>
                    <span className="text-[10px] text-[#A8C3A0] font-bold uppercase tracking-wider">
                      {items.length} {items.length === 1 ? 'Archive Piece' : 'Archive Pieces'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-[#2F6B4F]/10 text-[#2F6B4F] font-bold px-2 py-0.5 rounded-full uppercase">
                    1-of-1 Authenticated
                  </span>
                </div>

                {/* Itemized Garment List */}
                <div className="divide-y divide-[#A8C3A0]/15 max-h-64 overflow-y-auto pr-1">
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const product = item.products || item;
                      const price = parseFloat(item.price_at_purchase || product.price || 0);

                      return (
                        <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={product.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=150'}
                              alt={product.name || 'Vintage Garment'}
                              className="w-12 h-12 rounded-xl object-cover bg-[#F6F1E8] border border-[#A8C3A0]/30 shrink-0"
                            />
                            <div className="truncate">
                              <p className="font-bold text-[#23313A] truncate">{product.name || 'Archive Garment'}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#A8C3A0]">
                                <span>Size {product.size || 'OS'}</span>
                                <span>•</span>
                                <span>{product.condition_grade || 'Grade A'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-[#2F6B4F] block">
                              ₱{price.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[#23313A]/50">
                              Qty: {item.quantity || 1}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-xs text-[#A8C3A0]">
                      No itemized product records attached to this parcel.
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 text-xs border-t border-[#A8C3A0]/15 pt-3.5 text-[#23313A]/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#23313A]">
                      ₱{parseFloat(trackingData.subtotal || trackingData.total_amount || 0).toFixed(2)}
                    </span>
                  </div>

                  {parseFloat(trackingData.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-[#2F6B4F] font-semibold">
                      <span className="flex items-center gap-1">
                        <Tag size={11} /> Voucher Discount
                      </span>
                      <span>-₱{parseFloat(trackingData.discount_amount).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Shipping Fee ({trackingData.courier || 'J&T Express'})</span>
                    <span className="font-bold text-[#23313A]">
                      {parseFloat(trackingData.shipping_fee || 0) === 0 ? 'FREE' : `₱${parseFloat(trackingData.shipping_fee || 80).toFixed(2)}`}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#A8C3A0]/20 flex justify-between items-baseline text-base font-bold text-[#23313A]">
                    <span>Total Amount</span>
                    <span className="text-[#2F6B4F] text-lg font-bold">
                      ₱{parseFloat(trackingData.total_amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#A8C3A0] font-semibold flex items-center gap-1">
                      <CreditCard size={12} /> Payment Method:
                    </span>
                    <span className="font-bold text-[#23313A]">
                      {trackingData.payment_method || 'PayMongo Online'}
                    </span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 space-y-2.5">
                  <Link
                    to="/shop"
                    className="w-full flex items-center justify-center gap-2 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer text-center"
                  >
                    <ShoppingBag size={14} />
                    <span>Browse More Vintage</span>
                  </Link>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}