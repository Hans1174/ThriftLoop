import { API_URL } from './config';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, QrCode, Check, Loader2 } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching product detail:', err);
        setLoading(false);
      });
  }, [id]);

  const handleAddToCart = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="animate-spin text-[#8C7A6B]" size={20} /> Loading garment details...
      </div>
    );
  }

  if (!product || product.error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Garment Not Found</h2>
        <p className="text-xs text-gray-500">This 1-of-1 vintage item may have already been sold or moved.</p>
        <Link to="/shop" className="bg-[#8C7A6B] text-white px-5 py-2 rounded-xl text-xs font-bold">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans pb-16">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-[#E6DFD5]">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:underline">Shop</Link>
          <span>/</span>
          <span className="text-[#1A1A1A] font-semibold">{product.name}</span>
        </div>
        <Link to="/shop" className="flex items-center gap-1 text-xs font-bold hover:text-[#8C7A6B]">
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </header>

      {/* Main PDP Grid */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Gallery View */}
          <div className="space-y-4">
            <div className="bg-[#EFECE6] border border-[#E2DBD0] rounded-2xl h-[440px] flex items-center justify-center overflow-hidden p-4">
              <img
                src={product.image_url}
                alt={product.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* Garment Details & Actions */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#1A1A1A] text-white text-[11px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                  {product.condition_grade}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B]">
                  {product.category_name || 'Vintage'}
                </span>
              </div>

              <h1 className="font-serif text-3xl font-bold mt-2 text-[#1A1A1A]">{product.name}</h1>
              <p className="text-2xl font-bold text-[#E06D44] mt-2">₱{parseFloat(product.price).toFixed(2)}</p>

              {/* Garment Measurements */}
              <div className="bg-[#FAF7F2] border border-[#E6DFD5] rounded-xl p-4 my-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Flat-Lay Measurements</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase">Tag Size</p>
                    <p className="font-bold text-sm">{product.size}</p>
                  </div>
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase">Pit-to-Pit</p>
                    <p className="font-bold text-sm">{product.chest_width || 'N/A'}</p>
                  </div>
                  <div className="bg-white border border-[#E6DFD5] rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase">Length</p>
                    <p className="font-bold text-sm">{product.length || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Garment Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {product.description || 'Authentic single-inventory vintage garment curated by ThriftLoop.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6 border-t border-[#E6DFD5]">
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#8C7A6B] hover:bg-[#786759] text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
              >
                {added ? <><Check size={18} /> Added to Cart!</> : <><ShoppingBag size={18} /> Add to Cart</>}
              </button>
              <button
                onClick={() => setShowQrModal(true)}
                className="w-full bg-white border border-[#8C7A6B] text-[#8C7A6B] font-bold py-2.5 rounded-xl hover:bg-[#FAF7F2] flex items-center justify-center gap-2 text-sm transition-colors"
              >
                <QrCode size={16} /> View Product via QR Code
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-serif font-bold text-xl">Product QR Code</h3>
            <div className="bg-[#FAF7F2] p-4 rounded-xl inline-block border border-[#E6DFD5]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.href)}`}
                alt="Product QR"
                className="mx-auto"
              />
            </div>
            <p className="text-xs text-gray-500">Scan with your phone camera to view this 1-of-1 listing on mobile.</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}