'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, MessageSquare, Calendar, User, Flag } from 'lucide-react';
import { SellerDisputeDetailsAdmin } from './SellerDisputeDetailsAdmin';

interface SellerDispute {
  id: string;
  seller_id: string;
  dispute_type: string;
  title: string;
  description: string;
  evidence_urls: string[] | null;
  status: string;
  priority: string;
  admin_notes: string | null;
  resolution: string | null;
  resolved_by_admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  seller: {
    business_name: string;
    full_name: string;
    email: string;
    user: {
      full_name: string;
      email: string;
    };
  };
}

interface SellerDisputesAdminProps {
  disputes: SellerDispute[];
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  account_suspension: 'Account Suspension',
  product_rejection: 'Product Rejection',
  commission_dispute: 'Commission Dispute',
  payout_delay: 'Payout Delay',
  unfair_review: 'Unfair Review',
  policy_disagreement: 'Policy Disagreement',
  verification_issue: 'Verification Issue',
  other: 'Other',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Open' },
  under_review: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Under Review' },
  resolved: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Resolved' },
  closed: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Closed' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-blue-100 text-blue-800', label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
};

export function SellerDisputesAdmin({ disputes }: SellerDisputesAdminProps) {
  const [selectedDispute, setSelectedDispute] = useState<SellerDispute | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filterDisputes = (status: string) => {
    if (status === 'all') return disputes;
    if (status === 'active') return disputes.filter(d => d.status === 'open' || d.status === 'under_review');
    return disputes.filter(d => d.status === status);
  };

  const filteredDisputes = filterDisputes(activeTab);

  // Stats
  const openCount = disputes.filter(d => d.status === 'open').length;
  const reviewCount = disputes.filter(d => d.status === 'under_review').length;
  const resolvedCount = disputes.filter(d => d.status === 'resolved').length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-white">
          <p className="text-sm text-gray-600">Total Disputes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{disputes.length}</p>
        </Card>
        <Card className="p-4 bg-amber-50">
          <p className="text-sm text-amber-700">Open</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{openCount}</p>
        </Card>
        <Card className="p-4 bg-blue-50">
          <p className="text-sm text-blue-700">Under Review</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{reviewCount}</p>
        </Card>
        <Card className="p-4 bg-green-50">
          <p className="text-sm text-green-700">Resolved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{resolvedCount}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seller Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
              <TabsTrigger value="open">Open ({openCount})</TabsTrigger>
              <TabsTrigger value="under_review">Under Review ({reviewCount})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
            </TabsList>

            {['all', 'open', 'under_review', 'resolved'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {filteredDisputes.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No {tab !== 'all' ? tab : ''} seller disputes</p>
                  </div>
                ) : (
                  filteredDisputes.map(dispute => (
                    <Card key={dispute.id} className="hover:shadow-md transition-shadow border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Flag className="h-6 w-6 text-orange-600" />
                          </div>

                          {/* Dispute Details */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">{dispute.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {DISPUTE_TYPE_LABELS[dispute.dispute_type]}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${STATUS_CONFIG[dispute.status]?.color} border font-medium`}>
                                  {STATUS_CONFIG[dispute.status]?.label}
                                </Badge>
                                <Badge className={PRIORITY_CONFIG[dispute.priority]?.color}>
                                  {PRIORITY_CONFIG[dispute.priority]?.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-gray-800 line-clamp-2">{dispute.description}</p>
                            </div>

                            {/* Seller & Date Info */}
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{dispute.seller.business_name || dispute.seller.full_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(dispute.created_at)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            <Button
                              onClick={() => setSelectedDispute(dispute)}
                              className="bg-[#1DA1F2] hover:bg-[#1a8cd8]"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {dispute.status === 'resolved' ? 'View' : 'Review'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <SellerDisputeDetailsAdmin
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onUpdate={() => window.location.reload()}
        />
      )}
    </>
  );
}
