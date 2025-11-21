'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  User,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  Eye,
  ShoppingBag,
  Truck,
  Ban,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

// Define the exact type expected by this component
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
  
  // Stats
  sold_count: number;
  delivery_count: number;
  view_count: number;
  favorite_count: number;
  average_rating: number;
  review_count: number;
  
  // Status
  is_available: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  approval_status: string;

  // Admin Status
  admin_suspended: boolean;
  admin_suspension_reason: string | null;
  admin_suspended_at: string | null;

  created_at: string;
  
  // Seller Info (Joined)
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

interface ProductDetailSheetProps {
  product: DetailedProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAdminSuspend: (id: string) => void;
}

export function ProductDetailSheet({ 
  product, 
  isOpen, 
  onClose,
  onAdminSuspend 
}: ProductDetailSheetProps) {
  if (!product) return null;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="p-6 bg-white min-h-full">
          {/* Header */}
          <SheetHeader className="mb-6 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex gap-2 mb-2">
                  {product.admin_suspended ? (
                     <Badge variant="destructive" className="gap-1">
                       <AlertCircle className="h-3 w-3" /> Admin Suspended
                     </Badge>
                  ) : (
                    <Badge variant={product.approval_status === 'approved' ? "default" : "secondary"}>
                      {product.approval_status === 'approved' ? "Approved" : product.approval_status}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-2xl font-bold text-gray-900">{product.name}</SheetTitle>
                <SheetDescription>
                  Added on {format(new Date(product.created_at), 'PPP')}
                </SheetDescription>
              </div>
            </div>
            
            {/* Suspension Reason Box */}
            {product.admin_suspended && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-md p-3 text-sm">
                <p className="font-semibold text-red-800 mb-1">Reason for Suspension:</p>
                <p className="text-red-700">{product.admin_suspension_reason || "No reason provided"}</p>
              </div>
            )}
          </SheetHeader>

          {/* --- IMAGES --- */}
          <div className="mb-8">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Package className="h-4 w-4" /> Product Images
            </h3>
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <div className="flex p-4 gap-4">
                {product.image_urls.length > 0 ? (
                  product.image_urls.map((url, idx) => (
                    <div key={idx} className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-md border bg-gray-50">
                      <Image 
                        src={typeof url === 'string' ? url : ''} 
                        alt={`${product.name} - ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized // Handles external images without config issues
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-full py-8 text-center text-gray-500">No images available</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* --- SELLER DETAILS --- */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg border-b pb-2 text-gray-900">
                <User className="h-5 w-5" /> Seller Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm border">
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Name:</span>
                  <span className="col-span-2 font-medium text-gray-900">
                    {product.sellers?.business_name || product.sellers?.full_name || 'Unknown'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Email:</span>
                  <span className="col-span-2 text-gray-900">{product.sellers?.email}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Phone:</span>
                  <span className="col-span-2 text-gray-900">{product.sellers?.phone_number || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-gray-500">Location:</span>
                  <span className="col-span-2 text-gray-900">
                    {product.sellers?.university?.name || 'N/A'}
                    {product.sellers?.state ? `, ${product.sellers.state}` : ''}
                  </span>
                </div>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => onAdminSuspend(product.sellers?.id || '')} 
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend All Products by Seller
                  </Button>
                </div>
              </div>
            </div>

            {/* --- PRODUCT STATS --- */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg border-b pb-2 text-gray-900">
                <BarChart3 className="h-5 w-5" /> Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" /> Total Sold
                  </div>
                  <div className="text-xl font-bold text-blue-700">{product.sold_count}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="text-xs text-green-600 mb-1 flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Delivered
                  </div>
                  <div className="text-xl font-bold text-green-700">{product.delivery_count}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                  <div className="text-xs text-purple-600 mb-1 flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Views
                  </div>
                  <div className="text-xl font-bold text-purple-700">{product.view_count}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <div className="text-xs text-orange-600 mb-1 flex items-center gap-1">
                    <Star className="h-3 w-3" /> Rating
                  </div>
                  <div className="text-xl font-bold text-orange-700">
                    {product.average_rating} <span className="text-xs font-normal text-gray-500">({product.review_count})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* --- PRODUCT DETAILS --- */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900">Product Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="block text-gray-500 mb-1">Price</span>
                <span className="font-medium text-lg text-gray-900">{formatPrice(product.price)}</span>
                {product.original_price && (
                  <span className="block text-xs text-gray-400 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>
              <div>
                <span className="block text-gray-500 mb-1">Stock</span>
                <span className="font-medium text-gray-900">{product.stock_quantity} units</span>
              </div>
              <div>
                <span className="block text-gray-500 mb-1">Brand</span>
                <span className="font-medium text-gray-900">{product.brand || 'Generic'}</span>
              </div>
              <div>
                <span className="block text-gray-500 mb-1">Condition</span>
                <span className="font-medium capitalize text-gray-900">{product.condition}</span>
              </div>
            </div>
            
            <div className="mt-4">
              <span className="block text-gray-500 mb-2">Description</span>
              <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-md border">
                {product.description}
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button 
              variant={product.admin_suspended ? "default" : "destructive"}
              onClick={() => onAdminSuspend(product.id)}
            >
              {product.admin_suspended ? "Unsuspend Product" : "Suspend Product"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}