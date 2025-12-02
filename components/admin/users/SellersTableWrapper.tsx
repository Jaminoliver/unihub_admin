'use client';

import { useState } from 'react';
import { SellersTable } from './SellersTable';
import { UserDetailModal } from './UserDetailModal';

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

interface SellersTableWrapperProps {
  sellers: any[];
  universities: { id: string; name: string }[];
  states: string[];
}

export function SellersTableWrapper({ sellers, universities, states }: SellersTableWrapperProps) {
  const [selectedSeller, setSelectedSeller] = useState<any | null>(null);

  return (
    <>
      <SellersTable 
        sellers={sellers as Seller[]}
        universities={universities}
        states={states}
        onViewDetails={(seller) => setSelectedSeller(seller)}
      />
      {selectedSeller && (
        <UserDetailModal 
          user={selectedSeller}
          userType="seller"
          onClose={() => setSelectedSeller(null)}
        />
      )}
    </>
  );
}