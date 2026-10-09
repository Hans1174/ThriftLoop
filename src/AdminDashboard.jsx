import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, Trash2, CheckCircle, RefreshCw, 
  ShoppingBag, DollarSign, Tag, AlertCircle, 
  X, Search, UploadCloud, Pencil, Truck, Check
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://thriftloop-api-o7bh.onrender.com';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'orders'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Inventory Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = Create, object = Edit
  const [submitting, setSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState('file'); // 'file' | 'url'
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  // Backdrop guard: ensures click started AND ended on backdrop before closing
  const backdropMouseDownRef = useRef(false);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    category_name: 'Tops',
    condition_grade: 'Class A',
    size: 'M',
    price: '',
    image_url: '',
    description: '',
  });

  const categories = ['Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Shoes', 'Accessories'];
  const conditions = ['Brand New', 'Class A', 'Class B', 'Class C'];

  const getSizeOptions = (category) => {
    switch (category) {
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

  const fetchData = async () => {
    setLoading(true);
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

      if (!resProd.ok) throw new Error('Could not retrieve catalog inventory.');
      const prodData = await resProd.json();
      setProducts(Array.isArray(prodData) ? prodData : (prodData.products || []));

      if (resOrd && resOrd.ok) {
        const ordData = await resOrd.json();
        setOrders(Array.isArray(ordData) ? ordData : []);
      }
    } catch (err) {
      showToast(err.message || 'Error communicating with backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
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
      condition_grade: 'Class A',
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
    setForm({
      name: item.name || '',
      brand: item.brand || '',
      category_name: item.category_name || 'Tops',
      condition_grade: item.condition_grade || 'Class A',
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

      await fetchData();
      setIsModalOpen(false);
      setEditingItem(null);
      showToast(isEdit ? 'Listing specs updated!' : 'Piece published to boutique!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'sold' ? 'available' : 'sold';
    try {
      const token = localStorage.getItem('thriftloop_token');
      const res = await fetch(`${API_URL}/api/products/${item.product_id || item.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error('Status update failed.');
      setProducts((prev) =>
        prev.map((p) =>
          (p.product_id || p.id) === (item.product_id || item.id)
            ? { ...p, status: nextStatus }
            : p
        )
      );
      showToast(`Piece marked as ${nextStatus}!`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to permanently remove this archive piece?')) return;
    try {
      const token = localStorage.getItem('thriftloop_token');
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to delete piece.');
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
          String(ord.order_id) === String(orderId) ? { ...ord, status: newStatus } : ord
        )
      );
      showToast(`Order #${orderId} status updated to ${newStatus}.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Metrics
  const totalStock = products.length;
  const soldCount = products.filter((p) => p.status === 'sold').length;
  const availableCount = totalStock - soldCount;
  const totalValuation = products
    .filter((p) => p.status !== 'sold')
    .reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  // Filters
  const filteredProducts = products.filter((p) => {
    const q = searchFilter.toLowerCase();
    const matchesSearch = 
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.brand || '').toLowerCase().includes(q) ||
      String(p.category_name || '').toLowerCase().includes(q);

    const matchesCategory = 
      categoryFilter === 'ALL' || 
      String(p.category_name).toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'AVAILABLE' && p.status !== 'sold') ||
      (statusFilter === 'SOLD' && p.status === 'sold');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#23313A] font-sans py-8 sm:py-10 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Toast Alert */}
        {notification && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 ${
            notification.type === 'error'
              ? 'bg-[#E67E5F] text-white border-[#E67E5F]'
              : 'bg-[#2F6B4F] text-white border-[#2F6B4F]'
          }`}>
            {notification.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#23313A] mt-1">Admin Dashboard</h1>
            <p className="text-xs text-[#23313A]/60 font-medium">
              Manage one-of-a-kind vintage drops, edit item specs, and fulfill live orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#F6F1E8] hover:bg-[#A8C3A0]/20 text-[#23313A] text-xs font-bold px-4 py-2.5 rounded-xl border border-[#A8C3A0]/30 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Products</span>
            </button>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Live Inventory</span>
              <Package size={18} className="text-[#2F6B4F]" />
            </div>
            <p className="text-2xl font-serif font-bold text-[#23313A] mt-2">{availableCount}</p>
            <span className="text-[10px] font-semibold text-[#2F6B4F]">Ready for checkout</span>
          </div>

          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Sold Pieces</span>
              <CheckCircle size={18} className="text-[#E67E5F]" />
            </div>
            <p className="text-2xl font-serif font-bold text-[#23313A] mt-2">{soldCount}</p>
            <span className="text-[10px] font-semibold text-[#E67E5F]">Claimed archive items</span>
          </div>

          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Valuation</span>
              <DollarSign size={18} className="text-[#2F6B4F]" />
            </div>
            <p className="text-2xl font-serif font-bold text-[#23313A] mt-2">
              ₱{totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white border border-[#A8C3A0]/30 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between text-[#A8C3A0]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders</span>
              <ShoppingBag size={18} className="text-[#23313A]" />
            </div>
            <p className="text-2xl font-serif font-bold text-[#23313A] mt-2">{orders.length}</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-3 border-b border-[#A8C3A0]/30 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#2F6B4F] text-white shadow-xs'
                : 'bg-white text-[#23313A] hover:bg-[#F6F1E8]'
            }`}
          >
            Customer Orders ({orders.length})
          </button>
        </div>

        {/* Tab 1: Inventory Table */}
        {activeTab === 'inventory' && (
          <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl overflow-hidden shadow-xs">
            {/* Filter Toolbar */}
            <div className="p-4 sm:p-5 border-b border-[#A8C3A0]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3.5 top-3 text-[#A8C3A0]" />
                  <input
                    type="text"
                    placeholder="Search piece, brand, category..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2 text-xs font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="SOLD">Sold</option>
                </select>
              </div>

              <p className="text-[11px] text-[#A8C3A0] font-semibold">
                Showing {filteredProducts.length} of {products.length} listings
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F1E8]/50 border-b border-[#A8C3A0]/20 text-[#23313A]/70 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Size & Condition</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#A8C3A0]/15">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#A8C3A0] font-medium">
                        No products match your active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((item) => {
                      const id = item.product_id || item.id;
                      const isSold = item.status === 'sold';

                      return (
                        <tr key={id} className="hover:bg-[#F6F1E8]/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=100'}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-xl border border-[#A8C3A0]/30 shrink-0 bg-[#F6F1E8]"
                              />
                              <div>
                                <p className="font-bold text-[#23313A] line-clamp-1">{item.name}</p>
                                <p className="text-[10px] text-[#A8C3A0]">ID: #{id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-[#F6F1E8] text-[#23313A] font-bold px-2 py-0.5 rounded text-[10px] border border-[#A8C3A0]/30">
                              {item.brand || 'Vintage Archive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#23313A]/80">
                            {item.category_name || 'Vintage'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#23313A]">{item.size}</span>
                            <span className="block text-[10px] text-[#A8C3A0] font-medium">
                              {item.condition_grade}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[#2F6B4F]">
                            ₱{parseFloat(item.price || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isSold
                                  ? 'bg-[#E67E5F]/15 text-[#E67E5F]'
                                  : 'bg-[#2F6B4F]/15 text-[#2F6B4F]'
                              }`}
                            >
                              {isSold ? 'Sold' : 'Available'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 rounded-lg text-[#23313A] hover:bg-[#F6F1E8] hover:text-[#2F6B4F] transition-colors cursor-pointer border border-[#A8C3A0]/30"
                                title="Edit Specifications"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                  isSold
                                    ? 'bg-white border-[#2F6B4F] text-[#2F6B4F] hover:bg-[#2F6B4F] hover:text-white'
                                    : 'bg-white border-[#E67E5F] text-[#E67E5F] hover:bg-[#E67E5F] hover:text-white'
                                }`}
                              >
                                {isSold ? 'Available' : 'Sold'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(id)}
                                className="p-1.5 rounded-lg text-[#E67E5F] hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Piece"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Orders Table */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-[#A8C3A0]/30 rounded-3xl overflow-hidden shadow-xs p-6">
            {orders.length === 0 ? (
              <div className="py-16 text-center text-[#A8C3A0]">
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-50 text-[#2F6B4F]" />
                <p className="font-bold text-sm text-[#23313A]">No Customer Orders Yet</p>
                <p className="text-xs text-[#A8C3A0] mt-1">
                  Customer orders placed via PayMongo or COD will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F6F1E8]/50 border-b border-[#A8C3A0]/20 text-[#23313A]/70 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Order ID & Courier</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#A8C3A0]/15">
                    {orders.map((ord) => {
                      const orderId = ord.order_id || ord.id;
                      return (
                        <tr key={orderId} className="hover:bg-[#F6F1E8]/30">
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#23313A] block">#{orderId}</span>
                            <span className="text-[10px] text-[#A8C3A0] flex items-center gap-1 mt-0.5">
                              <Truck size={12} className="text-[#2F6B4F]" />
                              {ord.courier || 'J&T Express'} ({ord.tracking_number || 'Pending'})
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-[#23313A]">{ord.customer_name || 'Member'}</p>
                            <p className="text-[10px] text-[#A8C3A0]">{ord.email || ord.customer_email || 'No email'}</p>
                          </td>
                          <td className="py-3 px-4 text-[#23313A]/70 max-w-[200px] truncate">
                            {[ord.shipping_address, ord.city, ord.province].filter(Boolean).join(', ')}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#2F6B4F]">
                            ₱{parseFloat(ord.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 uppercase font-bold text-[10px] text-[#23313A]/70">
                            {ord.payment_method || 'PayMongo'}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={ord.status || 'pending'}
                              onChange={(e) => handleUpdateOrderStatus(orderId, e.target.value)}
                              className="bg-[#F6F1E8] border border-[#A8C3A0]/40 rounded-xl px-2.5 py-1 text-[11px] font-bold text-[#23313A] focus:outline-none focus:border-[#2F6B4F]"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal with Protected Backdrop */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              backdropMouseDownRef.current = true;
            }
          }}
          onMouseUp={(e) => {
            if (backdropMouseDownRef.current && e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
            backdropMouseDownRef.current = false;
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          {/* Visual Dark Overlay */}
          <div className="fixed inset-0 bg-[#23313A]/60 backdrop-blur-xs pointer-events-none" />

          {/* Modal Dialog Card */}
          <div 
            className="relative z-10 bg-white border border-[#A8C3A0]/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#A8C3A0]/20 mb-5">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#23313A]">
                  {editingItem ? 'Edit Vintage Listing' : 'Add 1-of-1 Vintage Listing'}
                </h3>
                <p className="text-[11px] text-[#A8C3A0] font-medium">
                  {editingItem 
                    ? `Updating archive piece #${editingItem.product_id || editingItem.id}` 
                    : 'Upload photos, specify sizes, and publish drops to ThriftLoop.'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#A8C3A0] hover:text-[#23313A] p-1 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4 text-xs">
              
              {/* Image Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-[#23313A] uppercase tracking-wider text-[10px]">
                    Garment Photo
                  </label>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageMode('file')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        imageMode === 'file' ? 'bg-[#2F6B4F] text-white' : 'text-[#A8C3A0] hover:text-[#23313A]'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        imageMode === 'url' ? 'bg-[#2F6B4F] text-white' : 'text-[#A8C3A0] hover:text-[#23313A]'
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
                        if (e.target.files && e.target.files[0]) {
                          handleFileProcess(e.target.files[0]);
                        }
                      }}
                    />

                    {previewUrl ? (
                      <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-[#2F6B4F]/40 bg-[#F6F1E8] group">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white text-[#23313A] text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer shadow-sm hover:bg-[#F6F1E8]"
                          >
                            Change Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewUrl('');
                              setForm((prev) => ({ ...prev, image_url: '' }));
                            }}
                            className="bg-[#E67E5F] text-white text-xs font-bold p-2 rounded-xl cursor-pointer shadow-sm"
                            title="Remove photo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-36 border-2 border-dashed border-[#A8C3A0]/60 hover:border-[#2F6B4F] bg-[#F6F1E8]/30 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors p-4 text-center group"
                      >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#2F6B4F] shadow-xs group-hover:scale-110 transition-transform">
                          <UploadCloud size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-[#23313A]">Click to browse or drag & drop photo</p>
                          <p className="text-[10px] text-[#A8C3A0] mt-0.5">Supports JPG, PNG, WEBP</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={form.image_url}
                      onChange={(e) => {
                        setForm({ ...form, image_url: e.target.value });
                        setPreviewUrl(e.target.value);
                      }}
                      className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                    />
                    {previewUrl && (
                      <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-[#A8C3A0]/30 bg-[#F6F1E8]">
                        <img 
                          src={previewUrl} 
                          alt="URL Preview" 
                          className="w-full h-full object-cover"
                          onError={() => setPreviewUrl('')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Garment Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Garment Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Plaid Chuck Taylor All-Star"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Brand / Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Converse, Carhartt, Nike"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                  />
                </div>
              </div>

              {/* Category, Dynamic Size, Condition */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Category
                  </label>
                  <select
                    value={form.category_name}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-[#2F6B4F]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    {form.category_name === 'Shoes' ? 'Shoe Size' : 'Size'}
                  </label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-[#2F6B4F]"
                  >
                    {getSizeOptions(form.category_name).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                    Condition
                  </label>
                  <select
                    value={form.condition_grade}
                    onChange={(e) => setForm({ ...form, condition_grade: e.target.value })}
                    className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:border-[#2F6B4F]"
                  >
                    {conditions.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                  Price (PHP ₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="450.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#23313A] mb-1 uppercase tracking-wider text-[10px]">
                  Description & Measurements
                </label>
                <textarea
                  rows="3"
                  placeholder="Authentic vintage piece. Detailed condition notes, distressing, and sole wear."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#F6F1E8]/50 border border-[#A8C3A0]/40 rounded-xl p-3 focus:outline-none focus:border-[#2F6B4F] text-[#23313A]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#A8C3A0]/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-[#23313A]/70 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#2F6B4F] hover:bg-[#23313A] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting 
                    ? (editingItem ? 'Saving Changes...' : 'Listing Piece...') 
                    : (editingItem ? 'Save Changes' : 'Publish to Shop')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}