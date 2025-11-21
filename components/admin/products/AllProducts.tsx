'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, CheckCircle2, XCircle, AlertCircle, Eye, Filter } from 'lucide-react';
import { ProductDetailSheet } from '@/components/admin/products/ProductDetailSheet';
import { toggleProductSuspension, suspendSellerProducts } from '@/app/admin/products/actions';

type SellerOption = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
};

type Seller = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  state: string | null;
  university: { name: string } | null;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  discount_percentage: number | null;
  condition: string;
  stock_quantity: number;
  image_urls: string[];
  brand: string | null;
  sku: string | null;
  category_id: string;
  
  sold_count: number;
  delivery_count: number;
  view_count: number;
  favorite_count: number;
  average_rating: number;
  review_count: number;
  
  is_available: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  approval_status: string;

  admin_suspended: boolean;
  admin_suspension_reason: string | null;
  admin_suspended_at: string | null;

  created_at: string;
  seller_id: string;
  sellers: Seller | null;
};

interface AllProductsProps {
  data: { products: Product[]; error: null | string };
  sellers?: SellerOption[]; 
  search?: string;
  status?: string;
  seller?: string;
}

export function AllProducts({
  data,
  sellers = [],
  search,
  status,
  seller,
}: AllProductsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read from URL params
  const currentSellerFilter = searchParams.get('seller') || 'all';
  const currentStatusFilter = searchParams.get('status') || 'all';
  const currentSearch = searchParams.get('search') || '';

  // Local state for search input
  const [localSearch, setLocalSearch] = useState(currentSearch);
  
  // Sync local search state with URL changes
  useEffect(() => {
    setLocalSearch(currentSearch);
  }, [currentSearch]);
  
  // Modal & Sheet State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Suspension Logic State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [targetSuspendId, setTargetSuspendId] = useState<string | null>(null);
  const [suspendType, setSuspendType] = useState<'single' | 'bulk_seller'>('single');

  // Safeguard: Ensure products is always an array
  const products = Array.isArray(data?.products) ? data.products : [];

  // Debug logging (remove after fixing)
  useEffect(() => {
    console.log('📦 AllProducts Debug:', {
      productsCount: products.length,
      sellersCount: sellers.length,
      currentSellerFilter,
      currentStatusFilter,
      currentSearch,
    });
  }, [products.length, sellers.length, currentSellerFilter, currentStatusFilter, currentSearch]);

  // --- Handlers ---

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  const handleSearchSubmit = () => {
    const params = new URLSearchParams(searchParams);
    if (localSearch.trim()) params.set('search', localSearch.trim());
    else params.delete('search');
    router.push(`?tab=all&${params.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value !== 'all') params.set('status', value);
    else params.delete('status');
    router.push(`?tab=all&${params.toString()}`);
  };

  const handleSellerChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value !== 'all') params.set('seller', value);
    else params.delete('seller');
    router.push(`?tab=all&${params.toString()}`);
  };

  const openProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsSheetOpen(true);
  };

  // --- Suspension Handlers ---

  const initiateSuspension = (productId: string) => {
    setTargetSuspendId(productId);
    setSuspendType('single');
    
    const product = products.find(p => p.id === productId);
    if (product?.admin_suspended) {
        handleToggleSuspension(productId, false);
    } else {
        setSuspendReason('');
        setShowSuspendModal(true);
    }
  };

  const initiateSellerSuspension = (sellerId: string) => {
    setTargetSuspendId(sellerId);
    setSuspendType('bulk_seller');
    setSuspendReason('');
    setShowSuspendModal(true);
  };

  const confirmSuspension = async () => {
    if (!targetSuspendId || !suspendReason.trim()) return;

    startTransition(async () => {
      if (suspendType === 'single') {
        await handleToggleSuspension(targetSuspendId, true, suspendReason);
      } else {
        await suspendSellerProducts(targetSuspendId, suspendReason);
      }
      
      setShowSuspendModal(false);
      setSuspendReason('');
      if (isSheetOpen) setIsSheetOpen(false);
      router.refresh();
    });
  };

  const handleToggleSuspension = async (id: string, isSuspended: boolean, reason?: string) => {
     const result = await toggleProductSuspension(id, isSuspended, reason);
     if (!result.success) {
       alert('Failed to update suspension status');
     } else {
       router.refresh();
     }
  };

  // --- Helpers ---

  const formatPrice = (price: number | string | null | undefined) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (typeof numericPrice !== 'number' || isNaN(numericPrice)) return '₦0.00';
    
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(numericPrice);
  };

  const getFirstImage = (imageUrls: string[] | string | null) => {
    if (!imageUrls) return null;
    try {
      const parsed = typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls;
      return Array.isArray(parsed) && parsed[0] ? parsed[0] : null;
    } catch {
      return null;
    }
  };

  const getStatusBadge = (product: Product) => {
    if (product.admin_suspended) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="h-3 w-3" />
            Admin Suspended
          </span>
        );
    }

    if (product.is_suspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <AlertCircle className="h-3 w-3" />
          Seller Paused
        </span>
      );
    }

    if (!product.is_available) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3" />
          Out of Stock
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    );
  };

  const stats = [
    {
      label: 'Total',
      value: products.length,
      color: 'blue',
    },
    {
      label: 'Active',
      value: products.filter((p) => p.is_available && !p.is_suspended && !p.admin_suspended).length,
      color: 'green',
    },
    {
      label: 'Suspended',
      value: products.filter((p) => p.is_suspended || p.admin_suspended).length,
      color: 'red',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-4 border-l-4" style={{ borderLeftColor: `var(--${stat.color}-500)` }}>
            <p className="text-sm text-gray-600">{stat.label} Products</p>
            <p className={`text-2xl font-bold mt-2 text-${stat.color}-600`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        {/* Search */}
        <div className="flex-1 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            onBlur={handleSearchSubmit}
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={currentStatusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Seller Filter */}
        <div className="w-full md:w-64 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <Filter className="h-4 w-4" />
          </div>
          <select
            value={currentSellerFilter}
            onChange={(e) => handleSellerChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Sellers</option>
            {Array.isArray(sellers) && sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.business_name || seller.full_name || seller.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stats</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No products found matching your filters
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openProductDetails(product)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFirstImage(product.image_urls) ? (
                          <img
                            src={getFirstImage(product.image_urls)!}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center border">
                            <span className="text-xs text-gray-400">Img</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {product.condition} • {product.brand || 'Generic'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {product.sellers?.business_name || product.sellers?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">{product.sellers?.university?.name || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>{product.sold_count || 0} Sold</p>
                        <p>{product.view_count || 0} Views</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(product)}</td>
                    <td className="px-6 py-4 text-right">
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           openProductDetails(product);
                         }}
                         className="p-2 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                         title="View Details"
                       >
                         <Eye className="h-4 w-4" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onAdminSuspend={initiateSuspension}
      />

      {/* Admin Suspension Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {suspendType === 'single' ? 'Suspend Product' : 'Suspend Seller Products'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {suspendType === 'single' 
                ? "This product will be hidden from the marketplace immediately. The seller cannot undo this."
                : "ALL products from this seller will be hidden. Use with caution."}
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Suspension
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Violation of terms, Counterfeit item..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm mb-4"
              rows={3}
              autoFocus
            />
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmSuspension}
                disabled={!suspendReason.trim() || isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {isPending ? 'Processing...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}