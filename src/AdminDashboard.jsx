import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, Trash2, CheckCircle, 
  ShoppingBag, DollarSign, Tag, AlertCircle, 
  X, Search, UploadCloud, Pencil, Truck, Check, MessageSquare,
  ImageIcon, ShieldCheck, Lock, Eye, Printer, MapPin, Phone, Mail, Calendar, ExternalLink
} from 'lucide-react';
import AdminInbox from './components/AdminInbox';

const API_URL = import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

const OFFICIAL_CATEGORIES = ['Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Footwear', 'Accessories'];

const normalizeCategory = (cat) => {
  if (!cat) return 'Tops';
  const c = cat.trim();
  if (c.toLowerCase() === 'shoes') return 'Footwear';
  const match = OFFICIAL_CATEGORIES.find((item) => item.toLowerCase() === c.toLowerCase());
  return match || 'Tops';
};

const normalizeCondition = (grade) => {
  if (!grade) return 'Good';
  const g = grade.trim().toLowerCase();
  if (['excellent', 'class a', 'grade a', 'brand new', 'deadstock'].includes(g)) return 'Excellent';
  if (['good', 'class b', 'grade b'].includes(g)) return 'Good';
  if (['used but not abused', 'class c', 'grade c', 'used'].includes(g)) return 'Used but not abused';
  if (['flawed', 'class d', 'grade d', 'flaw'].includes(g)) return 'Flawed';
  return 'Good';
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders' | 'messages'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const storedUser = localStorage.getItem('thriftloop_user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  // Inventory Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Orders Filters
  const [orderSearchFilter, setOrderSearchFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Modal State (Products)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState('file');
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const backdropMouseDownRef = useRef(false);

  // Modal State (Order Details & Invoice)
  const [viewingOrder, setViewingOrder] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  const conditions = ['Excellent', 'Good', 'Used but not abused', 'Flawed'];

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category_name: 'Tops',
    condition_grade: 'Excellent',
    size: 'M',
    price: '',
    image_url: '',
    description: '',
  });

  const getSizeOptions = (category) => {
    switch (category) {
      case 'Footwear':
      case 'Shoes':
        return [
          'US 5 (EU 37.5)', 'US 5.5 (EU 38)', 'US 6 (EU 38.5)', 'US 6.5 (EU 39)', 
          'US 7 (EU 40)', 'US 7.5 (EU 40.5)', 'US 8 (EU 41)', 'US 8.5 (EU 42)', 
          'US 9 (EU 42.5)', 'US 9.5 (EU 43)', 'US 10 (EU 44)', 'US 10.5 (EU 44.5)', 
          'US 11 (EU 45)', 'US 11.5 (EU 45.5)', 'US 12 (EU 46)', 'US 13 (EU 47.5)'
        ];
      case 'Bottoms':
        return ['24', '26', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42', 'OS'];
      case 'Accessories':
        return ['OS'];
      default:
        return ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', 'OS'];
    }
  };

  const showToast = (text, type = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCategoryChange = (cat) => {
    const newSizes = getSizeOptions(cat);
    setForm((prev) => ({
      ...prev,
      category_name: cat,
      size: newSizes.includes(prev.size) ? prev.size : newSizes[0],
    }));
  };

  // Automated background data fetch (silent polling avoids UI flickering)
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const token = localStorage.getItem('thriftloop_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [resProd, resOrd] = await Promise.all([
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/admin/orders`, { headers }).catch(() => null),
      ]);

      if (resProd.ok) {
        const prodData = await resProd.json();
        setProducts(Array.isArray(prodData) ? prodData : (prodData.products || []));
      }

      if (resOrd && resOrd.ok) {
        const ordData = await resOrd.json();
        setOrders(Array.isArray(ordData) ? ordData : []);
      }
    } catch (err) {
      if (!isSilent) showToast(err.message || 'Error communicating with backend.', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const syncInterval = setInterval(() => {
      fetchData(true);
    }, 4000);

    return () => clearInterval(syncInterval);
  }, []);

  const handleFileProcess = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1000;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewUrl(compressedBase64);
        setForm((prev) => ({ ...prev, image_url: compressedBase64 }));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setPreviewUrl('');
    setForm({
      name: '',
      brand: '',
      category_name: 'Tops',
      condition_grade: 'Excellent',
      size: 'M',
      price: '',
      image_url: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setPreviewUrl(item.image_url || '');

    const rawCat = item.categories?.name || item.category_name || 'Tops';
    const resolvedCat = normalizeCategory(rawCat);

    setForm({
      name: item.name || '',
      brand: item.brand || '',
      category_name: resolvedCat,
      condition_grade: normalizeCondition(item.condition_grade),
      size: item.size || 'M',
      price: item.price || '',
      image_url: item.image_url || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.image_url) {
      showToast('Please provide an item name, price, and image.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('thriftloop_token');
      const isEdit = Boolean(editingItem);
      const url = isEdit
        ? `${API_URL}/api/products/${editingItem.product_id || editingItem.id}`
        : `${API_URL}/api/products`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
        }),
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save product listing.');
      } else {
        throw new Error(`Server returned HTTP ${res.status}. Check server.js console.`);
      }

      await fetchData(true);
      setIsModalOpen(false);
      setEditingItem(null);
      showToast(isEdit ? 'Listing specs updated!' : 'Piece published to boutique!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (item) => {
    const id = item.product_id || item.id;
    if (item.status === 'sold') {
      showToast('Cannot delete sold piece. It is preserved for order history and audit records.', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to permanently remove this unsold archive piece?')) return;
    try {
      const token = localStorage.getItem('thriftloop_token');
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete piece.');

      setProducts((prev) => prev.filter((p) => (p.product_id || p.id) !== id));
      showToast('Piece deleted from inventory.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('thriftloop_token');
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update fulfillment status.');
      
      setOrders((prev) =>
        prev.map((ord) =>
          String(ord.order_id || ord.id) === String(orderId) ? { ...ord, status: newStatus } : ord
        )
      );

      if (viewingOrder && String(viewingOrder.order_id || viewingOrder.id) === String(orderId)) {
        setViewingOrder((prev) => ({ ...prev, status: newStatus }));
      }

      showToast(`Order #${orderId} status updated to ${newStatus}.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Open Full Order Details & Invoice View
  const handleOpenOrderDetails = async (order) => {
    setViewingOrder(order);
    const orderId = order.order_id || order.id;

    // If order_items are not embedded, fetch deep tracking relation
    if (!order.order_items || order.order_items.length === 0) {
      setLoadingOrderDetail(true);
      try {
        const res = await fetch(`${API_URL}/api/track/${orderId}`);
        if (res.ok) {
          const detailed = await res.json();
          setViewingOrder(detailed);
        }
      } catch (err) {
        console.warn('Could not load extra order line items:', err);
      } finally {
        setLoadingOrderDetail(false);
      }
    }
  };

  const renderConditionBadge = (rawCondition) => {
    const condition = normalizeCondition(rawCondition);
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium tracking-tight border border-[#A8C3A0]/40 bg-[#F6F1E8]/70 text-[#23313A]">
        {condition}
      </span>
    );
  };

  const renderOrderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';

    if (s === 'delivered') {
      badgeStyle = 'bg-[#2F6B4F]/15 text-[#2F6B4F] border-[#2F6B4F]/35';
    } else if (s === 'shipped') {
      badgeStyle = 'bg-sky-50 text-sky-800 border-sky-200';
    } else if (s === 'cancelled') {
      badgeStyle = 'bg-[#E67E5F]/15 text-[#E67E5F] border-[#E67E5F]/35';
    }

    return (
      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider border ${badgeStyle}`}>
        {status || 'Pending'}
      </span>
    );
  };

  // Metrics
  const totalStock = products.length;
  const soldCount = products.filter((p) => p.status === 'sold').length;
  const availableCount = totalStock - soldCount;
  const totalValuation = products
    .filter((p) => p.status !== 'sold')
    .reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  // Filters for Products
  const filteredProducts = products.filter((p) => {
    const q = searchFilter.toLowerCase();
    const rawCat = p.categories?.name || p.category_name || '';
    const resolvedCat = normalizeCategory(rawCat);

    const matchesSearch = 
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.brand || '').toLowerCase().includes(q) ||
      String(resolvedCat).toLowerCase().includes(q);

    const matchesCategory = 
      categoryFilter === 'ALL' || 
      String(resolvedCat).toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'AVAILABLE' && p.status !== 'sold') ||
      (statusFilter === 'SOLD' && p.status === 'sold');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filters for Orders
  const filteredOrders = orders.filter((o) => {
    const q = orderSearchFilter.toLowerCase();
    const orderId = String(o.order_id || o.id || '');
    const customer = String(o.customer_name || '').toLowerCase();
    const email = String(o.email || o.customer_email || '').toLowerCase();
    const tracking = String(o.tracking_number || '').toLowerCase();
    const address = String(o.shipping_address || '').toLowerCase();

    const matchesSearch = 
      orderId.includes(q) ||
      customer.includes(q) ||
      email.includes(q) ||
      tracking.includes(q) ||
      address.includes(q);

    const matchesStatus = 
      orderStatusFilter === 'ALL' || 
      String(o.status || 'pending').toLowerCase() === orderStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-mono py-6 sm:py-10 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Toast Alert */}
        {notification && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-mono font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 ${
            notification.type === 'error'
              ? 'bg-[#E67E5F] text-white border-[#E67E5F]'
              : 'bg-[#2F6B4F] text-white border-[#2F6B4F]'
          }`}>
            {notification.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Clean Header Banner */}
        <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs flex justify-between items-center gap-4">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#23313A]">
            Admin Dashboard
          </h1>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-mono font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Products</span>
          </button>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Live Inventory</span>
              <div className="w-8 h-8 rounded-lg bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center">
                <Package size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#23313A]">{availableCount}</p>
          </div>

          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Sold Pieces</span>
              <div className="w-8 h-8 rounded-lg bg-[#E67E5F]/10 text-[#E67E5F] flex items-center justify-center">
                <CheckCircle size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#23313A]">{soldCount}</p>
          </div>

          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Active Valuation</span>
              <div className="w-8 h-8 rounded-lg bg-[#2F6B4F]/10 text-[#2F6B4F] flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#23313A]">
              ₱{totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Total Orders</span>
              <div className="w-8 h-8 rounded-lg bg-[#23313A]/10 text-[#23313A] flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-[#23313A]">{orders.length}</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-[#A8C3A0]/30 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-[#2F6B4F] text-white shadow-xs'
                : 'bg-white text-[#23313A] hover:bg-[#F6F1E8]'
            }`}
          >
            Inventory Catalog ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#2F6B4F] text-white shadow-xs'
                : 'bg-white text-[#23313A] hover:bg-[#F6F1E8]'
            }`}
          >
            Customer Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-[#2F6B4F] text-white shadow-xs'
                : 'bg-white text-[#23313A] hover:bg-[#F6F1E8]'
            }`}
          >
            <MessageSquare size={14} />
            <span>Buyer Messages / Inbox</span>
          </button>
        </div>

        {/* Tab 1: Product Card Box Grid */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            
            {/* Filter Toolbar Card */}
            <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8C3A0]" />
                  <input
                    type="text"
                    placeholder="Search piece, brand, category..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                >
                  <option value="ALL">All Categories</option>
                  {OFFICIAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="SOLD">Sold</option>
                </select>
              </div>

              <p className="text-[11px] font-mono text-[#A8C3A0] font-semibold">
                Showing {filteredProducts.length} of {products.length} archive pieces
              </p>
            </div>

            {/* Product Card Boxes */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-12 text-center text-[#A8C3A0] space-y-2">
                <Package size={36} className="mx-auto text-[#2F6B4F] opacity-50" />
                <p className="font-serif font-bold text-sm text-[#23313A]">No garments match your active filters</p>
                <p className="text-xs font-mono">Try clearing the search query or changing category and status filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((item) => {
                  const id = item.product_id || item.id;
                  const isSold = item.status === 'sold';
                  const rawCategory = item.categories?.name || item.category_name;
                  const resolvedCategory = normalizeCategory(rawCategory);

                  return (
                    <div
                      key={id}
                      className="bg-white border border-[#A8C3A0]/35 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      {/* Photo Canvas */}
                      <div className="relative h-56 sm:h-60 w-full bg-[#F6F1E8] overflow-hidden border-b border-[#A8C3A0]/20 flex items-center justify-center p-3">
                        <img
                          src={item.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400'}
                          alt={item.name}
                          className="w-full h-full object-contain drop-shadow-xs"
                        />

                        {/* Top ID Pill */}
                        <div className="absolute top-3 right-3">
                          <span className="bg-[#23313A]/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs">
                            ID #{id}
                          </span>
                        </div>

                        {/* Brand Tag */}
                        <div className="absolute bottom-3 left-3">
                          <span className="bg-white/95 backdrop-blur-xs text-[#23313A] border border-[#A8C3A0]/30 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-xs">
                            {item.brand || 'Vintage Archive'}
                          </span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono font-medium text-[#A8C3A0]">
                            <span>{resolvedCategory}</span>
                            <span className="font-bold text-[#23313A] bg-[#F6F1E8] border border-[#A8C3A0]/30 px-2 py-0.5 rounded-md text-[10px]">
                              Size {item.size}
                            </span>
                          </div>

                          <h3 
                            className="font-serif font-bold text-base text-[#23313A] line-clamp-1"
                            title={item.name}
                          >
                            {item.name}
                          </h3>

                          <div>
                            {renderConditionBadge(item.condition_grade)}
                          </div>
                        </div>

                        {/* Price Section */}
                        <div className="pt-2 border-t border-[#A8C3A0]/15 flex items-baseline justify-between font-mono">
                          <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider">
                            Price
                          </span>
                          <span className="font-bold text-base sm:text-lg text-[#2F6B4F]">
                            ₱{parseFloat(item.price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="p-3 sm:p-4 border-t border-[#A8C3A0]/20 bg-[#F6F1E8]/30 flex items-center gap-2 font-mono">
                        <div
                          className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-bold text-center tracking-wider uppercase border flex items-center justify-center ${
                            isSold
                              ? 'bg-[#E67E5F]/15 text-[#E67E5F] border-[#E67E5F]/35'
                              : 'bg-[#2F6B4F]/15 text-[#2F6B4F] border-[#2F6B4F]/35'
                          }`}
                        >
                          <span>{isSold ? 'Sold' : 'Available'}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 rounded-xl text-[#23313A] bg-white hover:bg-[#F6F1E8] hover:text-[#2F6B4F] border border-[#A8C3A0]/30 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                          title="Edit Piece"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          disabled={isSold}
                          onClick={() => handleDeleteProduct(item)}
                          className={`p-2 rounded-xl transition-all shadow-xs shrink-0 ${
                            isSold
                              ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed opacity-50'
                              : 'text-[#E67E5F] bg-white hover:bg-[#E67E5F] hover:text-white border border-[#E67E5F]/30 cursor-pointer active:scale-95'
                          }`}
                          title={isSold ? 'Sold pieces cannot be deleted (linked to customer orders)' : 'Delete Piece'}
                        >
                          {isSold ? <Lock size={15} /> : <Trash2 size={15} />}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Customer Orders Card Box Grid (Matching Inventory UI) */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Order Filter Toolbar */}
            <div className="bg-white border border-[#A8C3A0]/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8C3A0]" />
                  <input
                    type="text"
                    placeholder="Search by customer, #ID, tracking..."
                    value={orderSearchFilter}
                    onChange={(e) => setOrderSearchFilter(e.target.value)}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <p className="text-[11px] font-mono text-[#A8C3A0] font-semibold">
                Showing {filteredOrders.length} of {orders.length} customer orders
              </p>
            </div>

            {/* Individual Customer Order Card Boxes */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl p-12 text-center text-[#A8C3A0] space-y-2">
                <ShoppingBag size={36} className="mx-auto text-[#2F6B4F] opacity-50" />
                <p className="font-serif font-bold text-sm text-[#23313A]">No customer orders match your criteria</p>
                <p className="text-xs font-mono">Customer purchases via PayMongo or COD will automatically appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredOrders.map((ord) => {
                  const orderId = ord.order_id || ord.id;
                  const firstItem = ord.order_items?.[0]?.products || ord.order_items?.[0] || null;
                  const itemCount = ord.order_items?.length || 1;
                  const orderDate = new Date(ord.created_at || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={orderId}
                      className="bg-white border border-[#A8C3A0]/35 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      {/* Top Visual Area */}
                      <div className="relative h-56 sm:h-60 w-full bg-[#F6F1E8] overflow-hidden border-b border-[#A8C3A0]/20 flex items-center justify-center p-3">
                        {firstItem?.image_url ? (
                          <img
                            src={firstItem.image_url}
                            alt={firstItem.name || 'Order Piece'}
                            className="w-full h-full object-contain drop-shadow-xs"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[#2F6B4F]/40 space-y-2">
                            <Package size={48} />
                            <span className="text-[10px] font-mono font-bold text-[#A8C3A0] uppercase">
                              {ord.courier || 'J&T Express'}
                            </span>
                          </div>
                        )}

                        {/* Order #ID Pill */}
                        <div className="absolute top-3 right-3">
                          <span className="bg-[#23313A]/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs">
                            #{orderId}
                          </span>
                        </div>

                        {/* Courier Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="bg-white/95 backdrop-blur-xs text-[#23313A] border border-[#A8C3A0]/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                            <Truck size={12} className="text-[#2F6B4F]" />
                            <span>{ord.courier || 'J&T Express'}</span>
                          </span>
                        </div>

                        {/* City Destination Pill */}
                        <div className="absolute bottom-3 left-3 max-w-[85%]">
                          <span className="bg-white/95 backdrop-blur-xs text-[#23313A] border border-[#A8C3A0]/30 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-xs truncate block">
                            {ord.city ? `${ord.city}, ${ord.province || ''}` : ord.shipping_address || 'Cavite'}
                          </span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono font-medium text-[#A8C3A0]">
                            <span>{orderDate}</span>
                            <span className="font-bold text-[#23313A] bg-[#F6F1E8] border border-[#A8C3A0]/30 px-2 py-0.5 rounded-md text-[10px]">
                              {itemCount} {itemCount === 1 ? 'Piece' : 'Pieces'}
                            </span>
                          </div>

                          {/* Customer Name */}
                          <h3 
                            className="font-serif font-bold text-base text-[#23313A] line-clamp-1"
                            title={ord.customer_name || 'Customer'}
                          >
                            {ord.customer_name || 'Member'}
                          </h3>

                          {/* Contact & Tracking Snippet */}
                          <p className="text-[11px] font-mono text-[#23313A]/60 truncate">
                            {ord.email || ord.customer_email || 'No email provided'}
                          </p>
                          <p className="text-[10px] font-mono text-[#A8C3A0] truncate">
                            Track: {ord.tracking_number || 'Pending Assignment'}
                          </p>

                          <div className="pt-1">
                            {renderOrderStatusBadge(ord.status)}
                          </div>
                        </div>

                        {/* Price & Payment Section */}
                        <div className="pt-2 border-t border-[#A8C3A0]/15 flex items-baseline justify-between font-mono">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#A8C3A0] block">
                              {ord.payment_method || 'PayMongo'}
                            </span>
                            <span className="font-bold text-base sm:text-lg text-[#2F6B4F]">
                              ₱{parseFloat(ord.total_amount || 0).toFixed(2)}
                            </span>
                          </div>

                          {/* Quick Status Select */}
                          <select
                            value={ord.status || 'pending'}
                            onChange={(e) => handleUpdateOrderStatus(orderId, e.target.value)}
                            className="bg-[#F6F1E8] border border-[#A8C3A0]/40 rounded-xl px-2 py-1 text-[11px] font-mono font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Action Footer: View Full Details / Invoice Button */}
                      <div className="p-3 sm:p-4 border-t border-[#A8C3A0]/20 bg-[#F6F1E8]/30 flex items-center gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => handleOpenOrderDetails(ord)}
                          className="w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold bg-[#2F6B4F] hover:bg-[#23313A] text-white transition-all cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-2"
                        >
                          <Eye size={15} />
                          <span>View Details & Invoice</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* Tab 3: Direct Messages / Seller Inbox */}
        {activeTab === 'messages' && (
          <AdminInbox currentUser={currentUser} />
        )}

      </div>

      {/* Product Create/Edit Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) backdropMouseDownRef.current = true;
          }}
          onMouseUp={(e) => {
            if (backdropMouseDownRef.current && e.target === e.currentTarget) setIsModalOpen(false);
            backdropMouseDownRef.current = false;
          }}
        >
          <div className="fixed inset-0 bg-[#23313A]/60 backdrop-blur-xs pointer-events-none" />

          <div 
            className="relative z-10 bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 md:p-10 max-w-4xl w-full shadow-2xl max-h-[92vh] overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-150 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-[#A8C3A0]/20 mb-6">
              <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#23313A]">
                {editingItem ? 'Edit Listing' : 'Add Listing'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#A8C3A0] hover:text-[#23313A] p-2 rounded-full hover:bg-[#F6F1E8] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="text-xs space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
                
                <div className="md:col-span-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#23313A] uppercase tracking-wider text-[10px]">
                      Garment Photo
                    </label>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold bg-[#F6F1E8] p-1 rounded-lg border border-[#A8C3A0]/30">
                      <button
                        type="button"
                        onClick={() => setImageMode('file')}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                          imageMode === 'file' ? 'bg-[#2F6B4F] text-white shadow-xs' : 'text-[#23313A]/70 hover:text-[#23313A]'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode('url')}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                          imageMode === 'url' ? 'bg-[#2F6B4F] text-white shadow-xs' : 'text-[#23313A]/70 hover:text-[#23313A]'
                        }`}
                      >
                        Paste URL
                      </button>
                    </div>
                  </div>

                  {imageMode === 'file' ? (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) handleFileProcess(e.target.files[0]);
                        }}
                      />

                      {previewUrl ? (
                        <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-[#2F6B4F]/40 bg-[#F6F1E8] group shadow-inner">
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-white text-[#23313A] text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-sm hover:bg-[#F6F1E8] transition-colors"
                            >
                              Change Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewUrl('');
                                setForm((prev) => ({ ...prev, image_url: '' }));
                              }}
                              className="bg-[#E67E5F] text-white text-xs font-bold p-2 rounded-xl cursor-pointer shadow-sm hover:bg-[#d67053] transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-64 sm:h-72 border-2 border-dashed border-[#A8C3A0]/60 hover:border-[#2F6B4F] bg-[#F6F1E8]/30 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all p-6 text-center group hover:bg-[#F6F1E8]/60"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#2F6B4F] shadow-xs group-hover:scale-110 transition-transform border border-[#A8C3A0]/30">
                            <UploadCloud size={26} />
                          </div>
                          <div>
                            <p className="font-bold text-xs">Click to browse or drag & drop</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={form.image_url}
                        onChange={(e) => {
                          setForm({ ...form, image_url: e.target.value });
                          setPreviewUrl(e.target.value);
                        }}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A] text-xs font-mono"
                      />
                      {previewUrl ? (
                        <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-[#A8C3A0]/30 bg-[#F6F1E8]">
                          <img src={previewUrl} alt="URL Preview" className="w-full h-full object-contain p-2" onError={() => setPreviewUrl('')} />
                        </div>
                      ) : (
                        <div className="w-full h-40 border border-dashed border-[#A8C3A0]/40 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#A8C3A0]">
                          <ImageIcon size={22} />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Description & Flat-Lay Notes
                    </label>
                    <textarea
                      rows="4"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl p-3 focus:outline-none focus:border-[#2F6B4F] text-[#23313A] leading-relaxed resize-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Garment Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A] font-serif font-bold text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                        Brand / Label
                      </label>
                      <input
                        type="text"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                        Price (PHP ₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A] font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                        Category
                      </label>
                      <select
                        value={form.category_name}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 font-mono font-bold focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                      >
                        {OFFICIAL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                        {form.category_name === 'Footwear' ? 'Shoe Size' : 'Size'}
                      </label>
                      <select
                        value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 font-mono font-bold focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                      >
                        {getSizeOptions(form.category_name).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                      Garment Condition
                    </label>
                    <select
                      value={form.condition_grade}
                      onChange={(e) => setForm({ ...form, condition_grade: e.target.value })}
                      className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 font-mono font-bold focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                    >
                      {conditions.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-[#A8C3A0]/20 flex items-center justify-end gap-3 font-mono">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-3 text-xs font-bold text-[#23313A]/70 hover:text-black transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-7 py-3 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {submitting 
                        ? (editingItem ? 'Saving Changes...' : 'Listing Piece...') 
                        : (editingItem ? 'Save Changes' : 'Publish to Shop')}
                    </button>
                  </div>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Order Details & Printable Invoice Modal */}
      {viewingOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setViewingOrder(null)}
        >
          <div className="fixed inset-0 bg-[#23313A]/60 backdrop-blur-xs pointer-events-none" />

          <div 
            className="relative z-10 bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 md:p-10 max-w-3xl w-full shadow-2xl max-h-[92vh] overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-150 font-mono"
            onClick={(e) => e.stopPropagation()}
            id="printable-invoice"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-[#A8C3A0]/20 mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider block">
                  Official Order Invoice
                </span>
                <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#23313A] mt-0.5">
                  Order #{viewingOrder.order_id || viewingOrder.id}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-mono font-bold text-[#2F6B4F] bg-[#F6F1E8] hover:bg-[#A8C3A0]/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Print official receipt"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">Print Receipt</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setViewingOrder(null)}
                  className="text-[#A8C3A0] hover:text-[#23313A] p-2 rounded-full hover:bg-[#F6F1E8] transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#A8C3A0]/20 text-xs">
              <div className="space-y-1.5 bg-[#F6F1E8]/40 p-4 rounded-2xl border border-[#A8C3A0]/20">
                <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Customer Details</span>
                <p className="font-serif font-bold text-base text-[#23313A]">
                  {viewingOrder.customer_name || 'Valued Collector'}
                </p>
                <p className="text-xs text-[#23313A]/70 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#2F6B4F]" />
                  <span>{viewingOrder.email || viewingOrder.customer_email || 'No email provided'}</span>
                </p>
                <p className="text-xs text-[#23313A]/70 flex items-center gap-1.5">
                  <Phone size={13} className="text-[#2F6B4F]" />
                  <span>{viewingOrder.phone || '09XXXXXXXXX'}</span>
                </p>
                <p className="text-xs text-[#23313A]/70 flex items-start gap-1.5 pt-1">
                  <MapPin size={13} className="text-[#2F6B4F] shrink-0 mt-0.5" />
                  <span>{[viewingOrder.shipping_address, viewingOrder.city, viewingOrder.province, viewingOrder.postal_code].filter(Boolean).join(', ')}</span>
                </p>
              </div>

              <div className="space-y-1.5 bg-[#F6F1E8]/40 p-4 rounded-2xl border border-[#A8C3A0]/20 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A8C3A0] block">Dispatch & Logistics</span>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-[#23313A]">Courier:</span>
                    <span>{viewingOrder.courier || 'J&T Express'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-[#23313A]">Tracking Code:</span>
                    <span className="font-mono font-bold text-[#2F6B4F]">
                      {viewingOrder.tracking_number || 'Assigning...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-[#23313A]">Payment Method:</span>
                    <span className="uppercase">{viewingOrder.payment_method || 'PayMongo'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#A8C3A0]/20 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#A8C3A0]">Fulfillment Status:</span>
                  <select
                    value={viewingOrder.status || 'pending'}
                    onChange={(e) => handleUpdateOrderStatus(viewingOrder.order_id || viewingOrder.id, e.target.value)}
                    className="bg-white border border-[#A8C3A0]/40 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F] cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Breakdown */}
            <div className="py-6 space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#A8C3A0] tracking-wider block">
                Purchased Pieces ({viewingOrder.order_items?.length || 1})
              </span>

              <div className="divide-y divide-[#A8C3A0]/15 border border-[#A8C3A0]/20 rounded-2xl overflow-hidden bg-white">
                {viewingOrder.order_items && viewingOrder.order_items.length > 0 ? (
                  viewingOrder.order_items.map((item, idx) => {
                    const product = item.products || item;
                    return (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=150'}
                            alt={product.name || 'Piece'}
                            className="w-12 h-12 rounded-xl object-contain bg-[#F6F1E8] border border-[#A8C3A0]/30 shrink-0"
                          />
                          <div className="truncate">
                            <p className="font-serif font-bold text-sm text-[#23313A] truncate">
                              {product.name || 'Vintage Garment'}
                            </p>
                            <p className="text-[10px] text-[#A8C3A0] mt-0.5">
                              Size: {product.size || 'OS'} • ID #{product.product_id || item.product_id || '—'}
                            </p>
                          </div>
                        </div>
                        <span className="font-serif font-bold text-sm text-[#2F6B4F] shrink-0">
                          ₱{parseFloat(item.price_at_purchase || product.price || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-[#A8C3A0]">
                    1-of-1 Curated Vintage Piece • Order #{viewingOrder.order_id || viewingOrder.id}
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Total Calculation Breakdown */}
            <div className="pt-4 border-t border-[#A8C3A0]/20 space-y-2 text-xs">
              <div className="flex justify-between text-[#23313A]/70">
                <span>Items Subtotal:</span>
                <span>₱{parseFloat(viewingOrder.subtotal || viewingOrder.total_amount || 0).toFixed(2)}</span>
              </div>

              {parseFloat(viewingOrder.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-[#2F6B4F] font-bold">
                  <span>Voucher Discount {viewingOrder.voucher_code ? `(${viewingOrder.voucher_code})` : ''}:</span>
                  <span>-₱{parseFloat(viewingOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#23313A]/70">
                <span>Courier Delivery ({viewingOrder.courier || 'Standard'}):</span>
                <span>
                  {parseFloat(viewingOrder.shipping_fee || 0) === 0 ? 'FREE' : `₱${parseFloat(viewingOrder.shipping_fee).toFixed(2)}`}
                </span>
              </div>

              <div className="pt-3 border-t border-[#A8C3A0]/30 flex justify-between items-baseline text-sm sm:text-base font-bold text-[#23313A]">
                <span>Grand Total Settled:</span>
                <span className="font-serif font-bold text-lg sm:text-xl text-[#2F6B4F]">
                  ₱{parseFloat(viewingOrder.total_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer Close */}
            <div className="pt-6 border-t border-[#A8C3A0]/20 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-mono font-bold px-7 py-3 rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}