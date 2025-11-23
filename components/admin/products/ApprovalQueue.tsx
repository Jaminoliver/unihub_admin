// FILE: components/admin/products/ApprovalQueue.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Search, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  approveProduct,
  rejectProduct,
  bulkApproveProducts,
  bulkRejectProducts,
} from '@/app/admin/dashboard/products/actions';

// ✅ Fixed: Match the actual return type from getApprovalQueue
type University = {
  id: string;
  name: string;
  state: string;
};

type Seller = {
  id: string;
  business_name: string;
  full_name: string;
  email: string;
  state: string;
  university_id: string;
  universities: University | null;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: string;
  stock_quantity: number;
  image_urls: string[];
  seller_id: string;
  brand?: string | null;
  sku?: string | null;
  sellers: Seller | null;
};

type ApprovalItem = {
  id: string;
  product_id: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  products: Product;
};

type ApprovalQueueProps = {
  data: { products: ApprovalItem[]; count: number; error: string | null };
  sellers?: Array<{
    id: string;
    business_name: string;
    full_name: string;
    email: string;
  }>;
  search?: string;
};

export function ApprovalQueue({ data, sellers = [], search }: ApprovalQueueProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(search || '');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [actionType, setActionType] = useState<'single' | 'bulk'>('single');
  const [targetProductId, setTargetProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ApprovalItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Filter products by search and seller with null safety
  const filteredProducts = data.products.filter((item) => {
    // Skip items with missing critical data
    if (!item?.products || !item.products.id) return false;
    
    const productName = item.products.name || '';
    const sellerId = item.products.seller_id || '';
    
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeller = selectedSeller === 'all' || sellerId === selectedSeller;
    return matchesSearch && matchesSeller;
  });

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set('search', value);
    else params.delete('search');
    router.push(`?tab=approval&${params.toString()}`);
  };

  const handleSellerFilter = (sellerId: string) => {
    setSelectedSeller(sellerId);
  };

  const toggleProduct = (productId: string) => {
    const newSet = new Set(selected);
    newSet.has(productId) ? newSet.delete(productId) : newSet.add(productId);
    setSelected(newSet);
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProducts.map((p) => p.product_id)));
    }
  };

  const handleApprove = async (productId?: string) => {
    startTransition(async () => {
      const ids = productId ? [productId] : Array.from(selected);
      const result =
        ids.length === 1
          ? await approveProduct(ids[0])
          : await bulkApproveProducts(ids);

      if (result.success) {
        router.refresh();
        setSelected(new Set());
        setShowDetailsModal(false);
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleRejectClick = (productId: string) => {
    setActionType('single');
    setTargetProductId(productId);
    setShowRejectModal(true);
  };

  const handleBulkRejectClick = () => {
    setActionType('bulk');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason');
      return;
    }

    startTransition(async () => {
      const ids = actionType === 'single' ? [targetProductId] : Array.from(selected);
      const result =
        ids.length === 1
          ? await rejectProduct(ids[0], rejectReason)
          : await bulkRejectProducts(ids, rejectReason);

      if (result.success) {
        router.refresh();
        setSelected(new Set());
        setShowRejectModal(false);
        setShowDetailsModal(false);
        setRejectReason('');
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const openDetailsModal = (item: ApprovalItem) => {
    setSelectedProduct(item);
    setShowDetailsModal(true);
  };

  const openImageModal = (item: ApprovalItem, index: number = 0) => {
    setSelectedProduct(item);
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  const nextImage = () => {
    if (selectedProduct) {
      setCurrentImageIndex((prev) => 
        prev < selectedProduct.products.image_urls.length - 1 ? prev + 1 : prev
      );
    }
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => prev > 0 ? prev - 1 : prev);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);

  const getFirstImage = (imageUrls: string[] | string | null | undefined) => {
    if (!imageUrls) return null;
    try {
      const parsed = typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls;
      return Array.isArray(parsed) && parsed[0] ? parsed[0] : null;
    } catch {
      return null;
    }
  };

  const getAllImages = (imageUrls: string[] | string | null | undefined): string[] => {
    if (!imageUrls) return [];
    try {
      const parsed = typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
          </div>

          {/* Seller Filter */}
          {sellers.length > 0 && (
            <select
              value={selectedSeller}
              onChange={(e) => handleSellerFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sellers</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.business_name || seller.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selected.size} product(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove()}
              disabled={isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              Approve All
            </button>
            <button
              onClick={handleBulkRejectClick}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              Reject All
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Products Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredProducts.length} of {data.products.length} pending products
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Submitted
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || selectedSeller !== 'all' 
                      ? 'No products match your filters' 
                      : 'No pending products'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const product = item.products;
                  return (
                    <tr key={item.product_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(item.product_id)}
                          onChange={() => toggleProduct(item.product_id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getFirstImage(product.image_urls) ? (
                            <img
                              src={getFirstImage(product.image_urls)!}
                              alt={product.name || 'Product'}
                              className="h-12 w-12 rounded object-cover cursor-pointer hover:opacity-75"
                              onClick={() => openImageModal(item, 0)}
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-400">No img</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {product.name || 'Unnamed Product'}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{product.condition || 'N/A'}</p>
                            {product.brand && (
                              <p className="text-xs text-gray-400">Brand: {product.brand}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {product.sellers?.business_name || product.sellers?.full_name || 'Unknown Seller'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{product.sellers?.email || 'N/A'}</p>
                          {product.sellers?.state && (
                            <p className="text-xs text-gray-400">{product.sellers.state}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {formatPrice(product.price || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{product.stock_quantity || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-500">
                         {new Date(item.created_at).toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric' 
})}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetailsModal(item)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleApprove(item.product_id)}
                            disabled={isPending}
                            className="p-2 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </button>
                          <button
                            onClick={() => handleRejectClick(item.product_id)}
                            disabled={isPending}
                            className="p-2 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5 text-red-600" />
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

      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Product Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Images Grid */}
              <div>
                <h4 className="font-semibold mb-3">Product Images</h4>
                <div className="grid grid-cols-4 gap-3">
                  {getAllImages(selectedProduct.products.image_urls).length > 0 ? (
                    getAllImages(selectedProduct.products.image_urls).map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border cursor-pointer hover:opacity-75"
                        onClick={() => openImageModal(selectedProduct, index)}
                      />
                    ))
                  ) : (
                    <div className="col-span-4 text-center text-gray-500 py-8">
                      No images available
                    </div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div>
                <h4 className="font-semibold mb-3">Product Information</h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-600">Name:</dt>
                    <dd className="font-medium">{selectedProduct.products.name || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Price:</dt>
                    <dd className="font-semibold text-green-600">
                      {formatPrice(selectedProduct.products.price || 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Condition:</dt>
                    <dd className="capitalize">{selectedProduct.products.condition || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Stock:</dt>
                    <dd>{selectedProduct.products.stock_quantity || 0} units</dd>
                  </div>
                  {selectedProduct.products.brand && (
                    <div>
                      <dt className="text-gray-600">Brand:</dt>
                      <dd>{selectedProduct.products.brand}</dd>
                    </div>
                  )}
                  {selectedProduct.products.sku && (
                    <div>
                      <dt className="text-gray-600">SKU:</dt>
                      <dd className="font-mono text-xs">{selectedProduct.products.sku}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-3">Description</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {selectedProduct.products.description || 'No description provided'}
                </p>
              </div>

              {/* Seller Info */}
              <div>
                <h4 className="font-semibold mb-3">Seller Information</h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-600">Business Name:</dt>
                    <dd className="font-medium">
                      {selectedProduct.products.sellers?.business_name || 
                       selectedProduct.products.sellers?.full_name || 
                       'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Email:</dt>
                    <dd>{selectedProduct.products.sellers?.email || 'N/A'}</dd>
                  </div>
                  {selectedProduct.products.sellers?.state && (
                    <div>
                      <dt className="text-gray-600">State:</dt>
                      <dd>{selectedProduct.products.sellers.state}</dd>
                    </div>
                  )}
                  {selectedProduct.products.sellers?.universities && (
                    <div>
                      <dt className="text-gray-600">University:</dt>
                      <dd>{selectedProduct.products.sellers.universities.name}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => handleApprove(selectedProduct.product_id)}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {isPending ? 'Approving...' : 'Approve Product'}
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleRejectClick(selectedProduct.product_id);
                  }}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  Reject Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageModal && selectedProduct && getAllImages(selectedProduct.products.image_urls).length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-5xl">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 bg-white rounded-lg hover:bg-gray-100 z-10"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 px-3 py-1 bg-black bg-opacity-70 text-white rounded-lg text-sm z-10">
              {currentImageIndex + 1} / {getAllImages(selectedProduct.products.image_urls).length}
            </div>

            {/* Main Image */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <img
                src={getAllImages(selectedProduct.products.image_urls)[currentImageIndex]}
                alt={`Product ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />

              {/* Navigation Arrows */}
              {currentImageIndex > 0 && (
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {currentImageIndex < getAllImages(selectedProduct.products.image_urls).length - 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {getAllImages(selectedProduct.products.image_urls).map((url, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    index === currentImageIndex ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {actionType === 'bulk' ? `Reject ${selected.size} Products` : 'Reject Product'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejection. The seller will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this product is rejected..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {isPending ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}