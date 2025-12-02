'use client';

import { useState } from 'react';
import { BuyersTable } from './BuyersTable';
import BuyerDetailsModal from './BuyersDetailsModal'; // Fixed: default import

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

interface BuyersTableWrapperProps {
  buyers: any[];
  universities: { id: string; name: string }[];
  states: string[];
}

export function BuyersTableWrapper({ buyers, universities, states }: BuyersTableWrapperProps) {
  const [selectedBuyer, setSelectedBuyer] = useState<any | null>(null);

  return (
    <>
      <BuyersTable 
        buyers={buyers as Buyer[]}
        universities={universities}
        states={states}
        onViewDetails={(buyer) => setSelectedBuyer(buyer)}
      />
      {selectedBuyer && (
        <BuyerDetailsModal 
          user={selectedBuyer}
          userType="buyer"
          onClose={() => setSelectedBuyer(null)}
        />
      )}
    </>
  );
}