'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { releaseEscrow, refundEscrow } from '@/app/admin/dashboard/transactions/actions';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface EscrowActionModalProps {
  escrow: any;
  action: 'release' | 'refund';
  onClose: () => void;
}

export function EscrowActionModal({ escrow, action, onClose }: EscrowActionModalProps) {
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    startTransition(async () => {
      const result = action === 'release' 
        ? await releaseEscrow(escrow.id, escrow.order_id, reason)
        : await refundEscrow(escrow.id, escrow.order_id, reason);

      if (result.success) {
        onClose();
      } else {
        alert(result.error);
      }
    });
  };

  const formatPrice = (amount: string | number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(parseFloat(amount.toString()));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'release' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Release Escrow to Seller
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-600" />
                Refund Escrow to Buyer
              </>
            )}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div className="flex items-center justify-between pt-2">
              <span>Order:</span>
              <span className="font-mono font-medium">{escrow.order?.order_number}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Amount:</span>
              <span className="font-bold text-lg">{formatPrice(escrow.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{action === 'release' ? 'Seller' : 'Buyer'}:</span>
              <span className="font-medium">
                {action === 'release' ? escrow.seller?.full_name : escrow.buyer?.full_name}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              Reason for {action === 'release' ? 'releasing' : 'refunding'} *
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter reason for ${action === 'release' ? 'releasing funds to seller' : 'refunding to buyer'}...`}
              rows={4}
              className="resize-none"
            />
          </div>

          {action === 'release' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium">This will:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Release {formatPrice(escrow.amount)} to seller's wallet</li>
                <li>Mark order as completed</li>
                <li>Update escrow status to "released"</li>
              </ul>
            </div>
          )}

          {action === 'refund' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <p className="font-medium">This will:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Refund {formatPrice(escrow.amount)} to buyer</li>
                <li>Mark order as refunded</li>
                <li>Update escrow status to "refunded"</li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" disabled={isPending} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isPending || !reason.trim()}
              className={`flex-1 ${action === 'release' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isPending ? 'Processing...' : `Confirm ${action === 'release' ? 'Release' : 'Refund'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}