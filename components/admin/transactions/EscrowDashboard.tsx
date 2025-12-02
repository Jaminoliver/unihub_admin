'use client';

import { useState } from 'react';
import { Search, Clock, AlertTriangle, Calendar, User, Building2, Package, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { format } from 'date-fns';

interface EscrowRecord {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: string;
  status: string;
  hold_until: string;
  created_at: string;
  released_at?: string;
  refunded_at?: string;
  order: {
    id: string;
    order_number: string;
    total_amount: string;
    payment_method: string;
    order_status: string;
    created_at: string;
    product: {
      id: string;
      name: string;
      image_urls: string[];
    };
  };
  buyer: {
    id: string;
    full_name: string;
    email: string;
    university: {
      name: string;
    };
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
    university: {
      name: string;
    };
  };
}

export function EscrowDashboard({ escrowRecords }: { escrowRecords: EscrowRecord[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const getDaysRemaining = (holdUntil: string): number => {
    const holdDate = new Date(holdUntil);
    const now = new Date();
    const diffTime = holdDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTimeUntilAutoRefund = (createdAt: string): string => {
    const created = new Date(createdAt);
    const autoRefundDate = new Date(created);
    autoRefundDate.setDate(autoRefundDate.getDate() + 6);
    
    const now = new Date();
    const diffMs = autoRefundDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffMs <= 0) return 'Overdue for auto-refund';
    if (diffDays === 0) return `${diffHours}h until auto-refund`;
    return `${diffDays}d ${diffHours}h until auto-refund`;
  };

  const getStatus = (escrow: EscrowRecord) => {
    const daysRemaining = getDaysRemaining(escrow.hold_until);
    if (escrow.status !== 'holding') return escrow.status;
    if (daysRemaining === 0) return 'ready';
    if (daysRemaining <= 1) return 'urgent';
    return 'active';
  };

  const filteredRecords = escrowRecords.filter(escrow => {
    const matchesSearch = 
      escrow.order?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      escrow.buyer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      escrow.seller?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      escrow.order?.product?.name?.toLowerCase().includes(search.toLowerCase());
    
    const status = getStatus(escrow);
    const matchesFilter = filter === 'all' || 
      (filter === 'urgent' && status === 'urgent') ||
      (filter === 'ready' && status === 'ready') ||
      (filter === 'active' && status === 'active') ||
      (filter === 'released' && escrow.status === 'released') ||
      (filter === 'refunded' && escrow.status === 'refunded');

    return matchesSearch && matchesFilter;
  });

  const formatPrice = (amount: string | number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(parseFloat(amount.toString()));

  const getStatusBadge = (escrow: EscrowRecord) => {
    if (escrow.status === 'released') {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            ✓ Released
          </Badge>
          <span className="text-xs text-gray-500">
            {escrow.released_at ? format(new Date(escrow.released_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
          </span>
        </div>
      );
    }
    
    if (escrow.status === 'refunded') {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
            ↺ Refunded
          </Badge>
          <span className="text-xs text-gray-500">
            {escrow.refunded_at ? format(new Date(escrow.refunded_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
          </span>
        </div>
      );
    }

    if (escrow.status === 'holding') {
      const isDelivered = escrow.order?.order_status === 'delivered';
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
            ⏳ Holding
          </Badge>
          <span className="text-xs text-gray-500">
            Since: {format(new Date(escrow.created_at), 'MMM dd, yyyy HH:mm')}
          </span>
          {!isDelivered && (
            <span className="text-xs font-medium text-orange-600 flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {getTimeUntilAutoRefund(escrow.created_at)}
            </span>
          )}
        </div>
      );
    }

    return (
      <Badge variant="outline" className="capitalize">
        {escrow.status}
      </Badge>
    );
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order, buyer, seller, or product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({escrowRecords.length})
            </Button>
            <Button
              variant={filter === 'urgent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('urgent')}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Urgent (≤1 day)
            </Button>
            <Button
              variant={filter === 'ready' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ready')}
            >
              Ready (0 days)
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'released' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('released')}
            >
              Released
            </Button>
            <Button
              variant={filter === 'refunded' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('refunded')}
            >
              Refunded
            </Button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredRecords.map((escrow) => {
            const daysRemaining = getDaysRemaining(escrow.hold_until);
            const status = getStatus(escrow);
            const product = escrow.order?.product;
            const productImage = product?.image_urls?.[0] || 'https://placehold.co/80x80/f97316/white?text=Product';

            return (
              <div key={escrow.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <Image
                      src={productImage}
                      alt={product?.name || 'Product'}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover border border-gray-200"
                    />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-lg font-bold text-gray-900">
                            {escrow.order?.order_number || `#${escrow.id.slice(0, 8)}`}
                          </span>
                          {getStatusBadge(escrow)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Payment Method: <span className="font-medium capitalize">{escrow.order?.payment_method}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Escrow Amount</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatPrice(escrow.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-3 gap-6">
                      {/* Product */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Package className="h-4 w-4" />
                          <span className="font-medium">Product</span>
                        </div>
                        <p className="font-medium text-gray-900">{product?.name || 'N/A'}</p>
                      </div>

                      {/* Buyer */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <User className="h-4 w-4" />
                          <span className="font-medium">Buyer</span>
                        </div>
                        <p className="font-medium text-gray-900">{escrow.buyer?.full_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{escrow.buyer?.email}</p>
                        <p className="text-xs text-gray-500">{escrow.buyer?.university?.name}</p>
                      </div>

                      {/* Seller */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">Seller</span>
                        </div>
                        <p className="font-medium text-gray-900">{escrow.seller?.full_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{escrow.seller?.email}</p>
                        <p className="text-xs text-gray-500">{escrow.seller?.university?.name}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-6 text-sm pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{format(new Date(escrow.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Hold Until:</span>
                        <span className="font-medium">{format(new Date(escrow.hold_until), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Order Status:</span>
                        <Badge variant="outline" className="capitalize">
                          {escrow.order?.order_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No escrow records found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}