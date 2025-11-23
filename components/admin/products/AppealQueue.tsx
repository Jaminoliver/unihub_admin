'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { approveAppeal, rejectAppeal } from '@/app/admin/dashboard/products/actions';

interface Appeal {
  id: string;
  product_id: string;
  seller_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_reason?: string;
  products: {
    name: string;
  };
  sellers: {
    user_id: string;
  };
}

interface AppealQueueProps {
  data: {
    appeals: Appeal[];
  };
}

export function AppealQueue({ data }: AppealQueueProps) {
  const router = useRouter();
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  const handleApprove = async (appeal: Appeal) => {
    startTransition(async () => {
      try {
        console.log('🔵 Approving appeal:', appeal.id);
        const result = await approveAppeal(appeal.id, appeal.product_id);

        if (!result.success) {
          throw new Error(result.error || 'Failed to approve appeal');
        }

        toast.success('Appeal approved and product unsuspended');
        setSelectedAppeal(null);
        router.refresh();
      } catch (error) {
        console.error('Error approving appeal:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to approve appeal');
      }
    });
  };

  const handleReject = async () => {
    if (!selectedAppeal || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    startTransition(async () => {
      try {
        console.log('🔴 Rejecting appeal:', selectedAppeal.id);
        const result = await rejectAppeal(selectedAppeal.id, rejectionReason);

        if (!result.success) {
          throw new Error(result.error || 'Failed to reject appeal');
        }

        toast.success('Appeal rejected');
        
        // Close dialogs and clear state
        setShowReasonDialog(false);
        setSelectedAppeal(null);
        setRejectionReason('');
        
        // Refresh the page
        router.refresh();
      } catch (error) {
        console.error('Error rejecting appeal:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to reject appeal');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const pendingAppeals = data.appeals.filter((a) => a.status === 'pending');
  const allAppeals = data.appeals;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Product Appeals</CardTitle>
          <CardDescription>
            Review and manage appeals from sellers for suspended products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingAppeals.length === 0 && allAppeals.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No appeals submitted yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingAppeals.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">
                    Pending Appeals ({pendingAppeals.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingAppeals.map((appeal) => (
                          <TableRow key={appeal.id}>
                            <TableCell className="font-medium">
                              {appeal.products.name}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate">{appeal.message}</p>
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(appeal.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedAppeal(appeal)}
                                  disabled={isPending}
                                >
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApprove(appeal)}
                                  disabled={isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  {isPending ? 'Processing...' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedAppeal(appeal);
                                    setShowReasonDialog(true);
                                  }}
                                  disabled={isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {allAppeals.filter((a) => a.status !== 'pending').length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">
                    Resolved Appeals ({allAppeals.filter((a) => a.status !== 'pending').length})
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Decision Date</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allAppeals
                          .filter((a) => a.status !== 'pending')
                          .map((appeal) => (
                            <TableRow key={appeal.id}>
                              <TableCell className="font-medium">
                                {appeal.products.name}
                              </TableCell>
                              <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(appeal.created_at), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-sm">
                                {appeal.admin_reason || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appeal Details Dialog */}
      <Dialog 
        open={!!selectedAppeal && !showReasonDialog} 
        onOpenChange={(open: boolean) => !open && setSelectedAppeal(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appeal Details</DialogTitle>
          </DialogHeader>
          {selectedAppeal && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Product</label>
                <p className="mt-1">{selectedAppeal.products.name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Appeal Message</label>
                <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md">
                  {selectedAppeal.message}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Status</label>
                <div className="mt-1">{getStatusBadge(selectedAppeal.status)}</div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Submitted</label>
                <p className="mt-1 text-sm">
                  {format(new Date(selectedAppeal.created_at), 'MMM dd, yyyy hh:mm a')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Appeal</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this appeal. The seller will see this message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Explain why this appeal is being rejected..."
              value={rejectionReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReasonDialog(false);
                setRejectionReason('');
                setSelectedAppeal(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !rejectionReason.trim()}
            >
              {isPending ? 'Rejecting...' : 'Reject Appeal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}