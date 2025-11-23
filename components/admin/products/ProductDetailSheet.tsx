'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Package,
  User,
  CheckCircle2,
  XCircle,
  Star,
  Eye,
  ShoppingBag,
  Ban,
  AlertCircle,
  Lock,
  Unlock,
  MapPin,
  Calendar,
  DollarSign,
  Heart,
  TrendingUp,
  ArrowLeft,
  Truck,
  Shield,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { approveProduct, rejectProduct, toggleProductSuspension, banProduct, unbanProduct } from '@/app/admin/dashboard/products/actions';

type DetailedProduct = {
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
  is_banned?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  created_at: string;
  seller_id: string;
  sellers: {
    id: string;
    business_name: string | null;
    full_name: string | null;
    email: string;
    phone_number: string | null;
    state: string | null;
    university?: { name: string } | null;
  } | null;
};

interface ProductDetailPageProps {
  product: DetailedProduct;
  onBack: () => void;
  onAction?: () => void;
}

export function ProductDetailPage({ product, onBack, onAction }: ProductDetailPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionDialog, setActionDialog] = useState<'reject' | 'suspend' | 'ban' | null>(null);
  const [reason, setReason] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  const [stats, setStats] = useState({
    view_count: product.view_count || 0,
    sold_count: product.sold_count || 0,
    delivery_count: product.delivery_count || 0,
    favorite_count: product.favorite_count || 0,
    average_rating: product.average_rating || 0,
    review_count: product.review_count || 0,
  });

 useEffect(() => {
  async function fetchRealStats() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const [viewsResult, reviewsResult, deliveredResult, ordersResult] = await Promise.all([
      supabase.from('product_views').select('*', { count: 'exact', head: true }).eq('product_id', product.id),
      supabase.from('reviews').select('rating').eq('product_id', product.id),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('product_id', product.id).eq('order_status', 'delivered'),
      supabase.from('orders').select('quantity').eq('product_id', product.id),
    ]);

    const totalSold = ordersResult.data?.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0) || 0;
    const wishlistCount = product.wishlist_count || 0;

    setStats({
      view_count: viewsResult.count || 0,
      sold_count: totalSold,
      delivery_count: deliveredResult.count || 0,
      favorite_count: wishlistCount,
      review_count: reviewsResult.data?.length || 0,
      average_rating: reviewsResult.data?.length 
        ? reviewsResult.data.reduce((sum, r) => sum + parseFloat(r.rating || '0'), 0) / reviewsResult.data.length 
        : 0,
    });
  }
  fetchRealStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveProduct(product.id);
      if (result.success) {
        onAction?.();
        onBack();
      }
    });
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    startTransition(async () => {
      const result = await rejectProduct(product.id, reason);
      if (result.success) {
        setActionDialog(null);
        setReason('');
        onAction?.();
        onBack();
      }
    });
  };

  const handleSuspend = () => {
    if (!reason.trim()) return;
    startTransition(async () => {
      const result = await toggleProductSuspension(product.id, true, reason);
      if (result.success) {
        setActionDialog(null);
        setReason('');
        onAction?.();
        onBack();
      }
    });
  };

  const handleUnsuspend = () => {
    startTransition(async () => {
      const result = await toggleProductSuspension(product.id, false);
      if (result.success) {
        onAction?.();
        onBack();
      }
    });
  };

  const handleBan = () => {
    if (!reason.trim()) return;
    startTransition(async () => {
      const result = await banProduct(product.id, reason);
      if (result.success) {
        setActionDialog(null);
        setReason('');
        onAction?.();
        onBack();
      }
    });
  };

  const handleUnban = () => {
    startTransition(async () => {
      const result = await unbanProduct(product.id);
      if (result.success) {
        onAction?.();
        onBack();
      }
    });
  };

  const getStatusBadge = () => {
    if (product.is_banned) {
      return <Badge variant="destructive" className="gap-1 text-sm"><Ban className="h-4 w-4" />Banned</Badge>;
    }
    if (product.admin_suspended) {
      return <Badge variant="destructive" className="gap-1 text-sm"><Lock className="h-4 w-4" />Admin Suspended</Badge>;
    }
    if (product.is_suspended) {
      return <Badge variant="outline" className="gap-1 text-sm border-orange-300 text-orange-700"><Lock className="h-4 w-4" />Seller Suspended</Badge>;
    }
    if (product.approval_status === 'pending') {
      return <Badge variant="secondary" className="gap-1 text-sm bg-yellow-100 text-yellow-800"><AlertCircle className="h-4 w-4" />Pending Approval</Badge>;
    }
    if (product.is_available) {
      return <Badge className="gap-1 text-sm bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-4 w-4" />Active</Badge>;
    }
    return <Badge variant="outline" className="text-sm">Inactive</Badge>;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-white animate-in fade-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                  <p className="text-sm text-gray-500 mt-1">ID: {product.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge()}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-6 py-8 overflow-y-auto h-[calc(100vh-80px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-in fade-in slide-in-from-left duration-500">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
                  <Image src={product.image_urls[selectedImage]} alt={product.name} fill className="object-cover transition-transform duration-300 hover:scale-105" />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {product.image_urls.map((url, idx) => (
                    <button key={idx} onClick={() => setSelectedImage(idx)} className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedImage === idx ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Image src={url} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-in fade-in slide-in-from-left duration-700">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Product Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-gray-900 leading-relaxed">{product.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Brand</label>
                      <p className="mt-1 text-gray-900 font-medium">{product.brand || 'Generic'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Condition</label>
                      <p className="mt-1 text-gray-900 font-medium capitalize">{product.condition}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">SKU</label>
                      <p className="mt-1 text-gray-900 font-medium">{product.sku || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Category ID</label>
                      <p className="mt-1 text-gray-900 font-medium text-xs">{product.category_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6 shadow-sm animate-in fade-in slide-in-from-left duration-900">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Performance Analytics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                      <span className="text-xs text-blue-600 font-semibold">VIEWS</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(stats.view_count || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Total impressions</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <ShoppingBag className="h-5 w-5 text-green-600" />
                      <span className="text-xs text-green-600 font-semibold">SOLD</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(stats.sold_count || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Units sold</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <Heart className="h-5 w-5 text-red-600" />
                      <span className="text-xs text-red-600 font-semibold">FAVORITES</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(stats.favorite_count || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Wishlisted</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <Star className="h-5 w-5 text-yellow-600" />
                      <span className="text-xs text-yellow-600 font-semibold">RATING</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(stats.average_rating || 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.review_count || 0} reviews</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <span className="text-xs text-purple-600 font-semibold">CONVERSION</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{((stats.view_count || 0) > 0 ? (((stats.sold_count || 0) / (stats.view_count || 1)) * 100).toFixed(1) : '0.0')}%</p>
                    <p className="text-xs text-gray-500 mt-1">View to purchase</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <Truck className="h-5 w-5 text-orange-600" />
                      <span className="text-xs text-orange-600 font-semibold">DELIVERED</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{(stats.delivery_count || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Successfully delivered</p>
                  </div>
                </div>
              </div>

              {(product.admin_suspended || product.is_banned) && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 animate-in fade-in slide-in-from-left duration-1000">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900 mb-2">
                        {product.is_banned ? '🚫 Product Permanently Banned' : '⚠️ Admin Suspension Active'}
                      </h3>
                      <p className="text-sm text-red-800 mb-1">
                        <span className="font-semibold">Reason:</span> {product.ban_reason || product.admin_suspension_reason}
                      </p>
                      {(product.banned_at || product.admin_suspended_at) && (
                        <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(product.banned_at || product.admin_suspended_at!), 'PPP p')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 shadow-sm animate-in fade-in slide-in-from-right duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-bold text-gray-900">Pricing & Stock</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-green-700 font-medium">Current Price</label>
                    <p className="text-4xl font-bold text-green-900 mt-1">₦{product.price.toLocaleString()}</p>
                    {product.original_price && (
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-lg text-gray-500 line-through">₦{product.original_price.toLocaleString()}</p>
                        {product.discount_percentage && (
                          <Badge className="bg-red-500 hover:bg-red-600">-{product.discount_percentage}%</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-green-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stock Available</span>
                      <span className="text-2xl font-bold text-gray-900">{product.stock_quantity}</span>
                    </div>
                    <div className="mt-2 bg-white rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Revenue Generated</span>
                        <span className="font-bold text-green-700">₦{(product.price * stats.sold_count).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-in fade-in slide-in-from-right duration-700">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Seller Information</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Business Name</p>
                      <p className="font-semibold text-gray-900 truncate">{product.sellers?.business_name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Owner Name</p>
                      <p className="font-semibold text-gray-900">{product.sellers?.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-blue-600 text-sm truncate">{product.sellers?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Shield className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-semibold text-gray-900">{product.sellers?.phone_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <MapPin className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Seller Location</p>
                      <p className="font-semibold text-gray-900">
                        {product.sellers?.university?.name || 'N/A'}
                        {product.sellers?.state && `, ${product.sellers.state}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Listed On</p>
                      <p className="font-semibold text-gray-900">{format(new Date(product.created_at), 'PPP')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-in fade-in slide-in-from-right duration-900">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-red-600" />
                  <h2 className="text-lg font-bold text-gray-900">Admin Actions</h2>
                </div>
                <div className="space-y-3">
                  {product.approval_status === 'pending' && (
                    <>
                      <Button onClick={handleApprove} disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 h-12">
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Approve Product
                      </Button>
                      <Button onClick={() => setActionDialog('reject')} disabled={isPending} variant="destructive" className="w-full h-12">
                        <XCircle className="h-5 w-5 mr-2" />
                        Reject Product
                      </Button>
                    </>
                  )}
                  {!product.is_banned && (
                    <>
                      {product.admin_suspended ? (
                        <Button onClick={handleUnsuspend} disabled={isPending} variant="outline" className="w-full h-12 border-green-300 text-green-700 hover:bg-green-50">
                          <Unlock className="h-5 w-5 mr-2" />
                          Unsuspend Product
                        </Button>
                      ) : (
                        <Button onClick={() => setActionDialog('suspend')} disabled={isPending} variant="outline" className="w-full h-12 border-orange-300 text-orange-700 hover:bg-orange-50">
                          <Lock className="h-5 w-5 mr-2" />
                          Suspend Product
                        </Button>
                      )}
                      <Button onClick={() => setActionDialog('ban')} disabled={isPending} variant="destructive" className="w-full h-12">
                        <Ban className="h-5 w-5 mr-2" />
                        Ban Product Permanently
                      </Button>
                    </>
                  )}
                  {product.is_banned && (
                    <Button onClick={handleUnban} disabled={isPending} variant="outline" className="w-full h-12 border-green-300 text-green-700 hover:bg-green-50">
                      <Unlock className="h-5 w-5 mr-2" />
                      Unban Product
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {actionDialog === 'reject' && '❌ Reject Product'}
              {actionDialog === 'suspend' && '⚠️ Suspend Product'}
              {actionDialog === 'ban' && '🚫 Ban Product'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'reject' && 'Provide a detailed reason for rejecting this product. The seller will be notified.'}
              {actionDialog === 'suspend' && 'Temporarily suspend this product from the marketplace. Can be reversed later.'}
              {actionDialog === 'ban' && 'Permanently ban this product. This is a severe action and should be used carefully.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Enter detailed reason..." value={reason} onChange={(e) => setReason(e.target.value)} rows={5} className="resize-none" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (actionDialog === 'reject') handleReject();
              if (actionDialog === 'suspend') handleSuspend();
              if (actionDialog === 'ban') handleBan();
            }} disabled={!reason.trim() || isPending}>
              {isPending ? 'Processing...' : 'Confirm Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}