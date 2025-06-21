import React, { useState } from 'react';

interface ShopifyPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (opts: { mode: 'gallery' | 'product'; productId?: string }) => void;
  loading?: boolean;
}

const ShopifyPushModal: React.FC<ShopifyPushModalProps> = ({ isOpen, onClose, onConfirm, loading }) => {
  const [mode, setMode] = useState<'gallery' | 'product'>('gallery');
  const [productId, setProductId] = useState('');
  const [touched, setTouched] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (mode === 'product' && !productId.trim()) {
      setTouched(true);
      return;
    }
    onConfirm({ mode, productId: mode === 'product' ? productId.trim() : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700/50 p-8 shadow-2xl">
        <h2 className="text-xl font-bold mb-6 text-gray-100">Push to Shopify</h2>
        <div className="mb-6 space-y-4">
          <div>
            <label className="block font-medium mb-2 text-gray-200">Where do you want to push the image(s)?</label>
            <div className="flex gap-4">
              <button
                className={`flex-1 px-4 py-2 rounded-full border-2 font-semibold transition-all duration-200 ${mode === 'gallery' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-800/80 border-gray-600/50 text-gray-200 hover:bg-gray-700/80'}`}
                onClick={() => setMode('gallery')}
                type="button"
              >
                Gallery (Shopify Files)
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-full border-2 font-semibold transition-all duration-200 ${mode === 'product' ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-gray-800/80 border-gray-600/50 text-gray-200 hover:bg-gray-700/80'}`}
                onClick={() => setMode('product')}
                type="button"
              >
                Product
              </button>
            </div>
          </div>
          {mode === 'product' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product ID</label>
              <input
                type="text"
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-gray-200 bg-gray-800/80 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${touched && !productId.trim() ? 'border-red-500' : 'border-gray-600/50'}`}
                placeholder="Enter Shopify Product ID"
                required
              />
              {touched && !productId.trim() && (
                <p className="text-xs text-red-400 mt-1">Product ID is required</p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 bg-gray-800/80 text-gray-200 hover:bg-gray-700/80 border border-gray-600/50"
            type="button"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-all duration-200 bg-green-600/80 text-white hover:bg-green-500/80 border border-green-500/50 disabled:opacity-50"
            disabled={loading || (mode === 'product' && !productId.trim())}
            type="button"
          >
            {loading ? 'Pushing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShopifyPushModal; 