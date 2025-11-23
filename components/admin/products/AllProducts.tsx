'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, CheckCircle2, XCircle, AlertCircle, Eye, Filter } from 'lucide-react';
import { ProductDetailPage } from '@/components/admin/products/ProductDetailSheet';
import { Lock, Ban } from 'lucide-react';
import { toggleProductSuspension, banProduct } from '@/app/admin/dashboard/products/actions';


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
  wishlist_count: number;
  
  is_available: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  approval_status: string;

  admin_suspended: boolean;
  admin_suspension_reason: string | null;
  admin_suspended_at: string | null;

  is_banned: boolean; // ✅ Add this
  ban_reason: string | null; // ✅ Add this
  banned_at: string | null; // ✅ Add this


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
    console.log('Opening product details:', product?.name, product?.id);
    setSelectedProduct(product);
    setIsSheetOpen(true);
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
  // Check banned first
  if (product.is_banned) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        <Ban className="h-3 w-3" />
        Banned
      </span>
    );
  }

  // Check admin suspension
  if (product.admin_suspended) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        <AlertCircle className="h-3 w-3" />
        Admin Suspended
      </span>
    );
  }

  // Check seller suspension
  if (product.is_suspended) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        <AlertCircle className="h-3 w-3" />
        Seller Paused
      </span>
    );
  }

  // Check actual stock quantity instead of is_available flag
  if (product.stock_quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle className="h-3 w-3" />
        Out of Stock
      </span>
    );
  }

  // Product is active
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
    <p>{product.stock_quantity || 0} In Stock</p>
    <p className="text-gray-400">View details for stats</p>
  </div>
</td>
              <td className="px-6 py-4">{getStatusBadge(product)}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openProductDetails(product); }}
                    className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {!product.admin_suspended && !product.is_banned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const reason = prompt('Reason for suspension:');
                        if (reason) {
                          startTransition(async () => {
                            await toggleProductSuspension(product.id, true, reason);
                            router.refresh();
                          });
                        }
                      }}
                      className="p-2 hover:bg-orange-100 rounded-full text-orange-600"
                      title="Suspend"
                    >
                      <Lock className="h-4 w-4" />
                    </button>
                  )}
                  {!product.is_banned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const reason = prompt('Reason for permanent ban:');
                        if (reason) {
                          startTransition(async () => {
                            await banProduct(product.id, reason);
                            router.refresh();
                          });
                        }
                      }}
                      className="p-2 hover:bg-red-100 rounded-full text-red-600"
                      title="Ban"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>

      {/* Product Detail Page */}
      {selectedProduct && isSheetOpen && (
        <ProductDetailPage
          product={selectedProduct}
          onBack={() => setIsSheetOpen(false)}
          onAction={() => router.refresh()}
        />
      )}
    </div>
  );
}