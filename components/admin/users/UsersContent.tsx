'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BuyersTable } from './BuyersTable';
import { SellersTable } from './SellersTable';
import { SellerApprovalCard } from './SellerApprovalCard';
import { UserDetailModal } from './UserDetailModal';
import { getBuyerDetails, getSellerDetails } from '@/app/admin/dashboard/users/actions';

type Buyer = {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  state: string | null;
  account_status: string;
  created_at: string;
  orders_count?: number;
  university?: { name: string; state: string } | null;
};

type Seller = {
  id: string;
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  state: string | null;
  bank_verified: boolean;
  approval_status: string;
  account_status: string;
  wallet_balance: string;
  created_at: string;
  products_count?: number;
  orders_count?: number;
  university?: { name: string; state: string } | null;
};

interface UsersContentProps {
  buyers: Buyer[];
  sellers: Seller[];
  pendingSellers: Seller[];
  universities: { id: string; name: string }[];
  states: string[];
  activeTab: string;
}

export function UsersContent({ buyers, sellers, pendingSellers, universities, states, activeTab }: UsersContentProps) {
  const router = useRouter();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userType, setUserType] = useState<'buyer' | 'seller'>('buyer');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const handleViewBuyerDetails = async (buyer: Buyer) => {
    setIsLoadingDetails(true);
    const result = await getBuyerDetails(buyer.id);
    setIsLoadingDetails(false);
    
    if (result.buyer) {
      setSelectedUser({ ...result.buyer, orders: result.orders });
      setUserType('buyer');
      setShowDetailModal(true);
    }
  };

  const handleViewSellerDetails = async (seller: Seller) => {
    setIsLoadingDetails(true);
    const result = await getSellerDetails(seller.id);
    setIsLoadingDetails(false);
    
    if (result.seller) {
      setSelectedUser({ ...result.seller, products: result.products, orders: result.orders });
      setUserType('seller');
      setShowDetailModal(true);
    }
  };

  const handleRefresh = () => {
    router.refresh();
  };

  if (activeTab === 'quick-approval') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingSellers.map((seller) => (
          <SellerApprovalCard key={seller.id} seller={seller} onAction={handleRefresh} />
        ))}
      </div>
    );
  }

  return (
    <>
      {activeTab === 'buyers' ? (
        <BuyersTable 
          buyers={buyers} 
          universities={universities}
          states={states}
          onViewDetails={handleViewBuyerDetails}
        />
      ) : (
        <SellersTable 
          sellers={sellers}
          universities={universities}
          states={states}
          onViewDetails={handleViewSellerDetails}
        />
      )}

      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          userType={userType}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {isLoadingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-4">Loading details...</p>
          </div>
        </div>
      )}
    </>
  );
}