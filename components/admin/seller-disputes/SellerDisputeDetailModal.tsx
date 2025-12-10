'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { X, AlertTriangle, Store, Shield, CheckCircle, MessageSquare, UserCheck, FileText, Image as ImageIcon, Send, MessageCircle, Paperclip, Sparkles, Loader2 } from 'lucide-react';
import { 
  getSellerDisputeDetails, 
  updateSellerDisputeStatus, 
  updateSellerDisputePriority, 
  resolveSellerDispute, 
  addSellerDisputeAdminNotes,
  getSellerDisputeInternalNotes,
  addSellerDisputeInternalNote
} from '@/app/admin/dashboard/seller-disputes/actions';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

type SellerDisputeDetail = {
  id: string;
  dispute_number?: string;
  seller_id: string;
  dispute_type: string;
  title: string;
  description: string;
  evidence_urls: string[] | null;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_notes: string | null;
  resolution: string | null;
  resolved_by_admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_admin_id?: string | null;
  assigned_at?: string | null;
  seller?: {
    id: string;
    business_name: string;
    full_name: string;
    email: string;
    state: string;
  };
  resolved_by?: { id: string; full_name: string; email: string; role?: string; admin_number?: string } | null;
  assigned_to?: { id: string; full_name: string; email: string; role?: string; admin_number?: string } | null;
};

interface DisputeMessage {
  id: string;
  sender_type: 'seller' | 'admin';
  message: string;
  attachments: string[] | null;
  created_at: string;
}

interface CannedResponse {
  id: string;
  title: string;
  message: string;
  category: string;
}

interface SellerDisputeDetailModalProps {
  disputeId: string;
  onClose: () => void;
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

export function SellerDisputeDetailModal({ disputeId, onClose }: SellerDisputeDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [dispute, setDispute] = useState<SellerDisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [adminNotesText, setAdminNotesText] = useState('');
  const [internalNotes, setInternalNotes] = useState<any[]>([]);
  const [newInternalNote, setNewInternalNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);

  // Chat states
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadDispute();
    loadInternalNotes();
    if (showChatModal) {
      loadMessages();
      loadCannedResponses();
    }
  }, [disputeId, showChatModal]);

  useEffect(() => {
    if (showChatModal) {
      scrollToBottom();
    }
  }, [messages, showChatModal]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadDispute = async () => {
    setLoading(true);
    try {
      const result = await getSellerDisputeDetails(disputeId);
      const { dispute: data, error } = result;
      
      if (error) {
        alert(`Error loading dispute: ${error}`);
        return;
      }
      
      if (data) {
        setDispute(data as SellerDisputeDetail);
        setAdminNotesText(data.admin_notes || '');
      } else {
        alert('No dispute data found');
      }
    } catch (err) {
      alert(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadInternalNotes = async () => {
    try {
      const result = await getSellerDisputeInternalNotes(disputeId);
      if (result.notes) {
        setInternalNotes(result.notes);
      }
    } catch (error) {
      console.error('Error loading internal notes:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('seller_dispute_messages')
        .select('*')
        .eq('seller_dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadCannedResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('canned_responses')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setCannedResponses(data || []);
    } catch (error) {
      console.error('Error loading canned responses:', error);
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    
    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isValid = isImage || isPDF;
      
      if (!isValid) {
        alert(`${file.name}: Only images (JPG, PNG, WebP) and PDFs are allowed`);
      }
      
      return isValid;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of selectedFiles) {
      try {
        let fileToUpload = file;
        
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }
        
        const fileName = `seller-disputes/${disputeId}/${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('dispute-evidence')
          .upload(fileName, fileToUpload);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('dispute-evidence')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    }
    
    return uploadedUrls;
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || isSending) return;

    setIsSending(true);
    setUploadingFiles(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let attachmentUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        attachmentUrls = await uploadFiles();
      }

      const { error } = await supabase
        .from('seller_dispute_messages')
        .insert({
          seller_dispute_id: disputeId,
          sender_id: user.id,
          sender_type: 'admin',
          message: newMessage.trim() || '📎 Attachment',
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedFiles([]);
      setShowCannedResponses(false);
      await loadMessages();
    } catch (error: any) {
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setIsSending(false);
      setUploadingFiles(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCannedResponseSelect = (response: CannedResponse) => {
    setNewMessage(response.message);
    setShowCannedResponses(false);
  };

  const handleSendInternalNote = async () => {
    if (!newInternalNote.trim()) return;
    
    setSendingNote(true);
    try {
      const result = await addSellerDisputeInternalNote(disputeId, newInternalNote);
      if (result.success) {
        setNewInternalNote('');
        await loadInternalNotes();
      } else {
        alert(`Failed to send note: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSendingNote(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || 'file';
  };

  const handleStatusChange = async (newStatus: 'open' | 'under_review' | 'resolved' | 'closed') => {
    startTransition(async () => {
      const result = await updateSellerDisputeStatus(disputeId, newStatus);
      if (result.success) {
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handlePriorityChange = async (newPriority: 'low' | 'medium' | 'high' | 'urgent') => {
    startTransition(async () => {
      const result = await updateSellerDisputePriority(disputeId, newPriority);
      if (result.success) {
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleSaveNotes = async () => {
    startTransition(async () => {
      const result = await addSellerDisputeAdminNotes(disputeId, adminNotesText);
      if (result.success) {
        alert('Notes saved successfully');
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleResolveDispute = async () => {
    if (!resolution.trim()) {
      alert('Please provide a resolution description');
      return;
    }

    startTransition(async () => {
      const result = await resolveSellerDispute(disputeId, resolution, adminNotesText);
      if (result.success) {
        setShowResolveModal(false);
        alert('Dispute resolved successfully');
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dispute details...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">Failed to load dispute details</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const canResolve = dispute.status !== 'resolved' && dispute.status !== 'closed';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-6xl w-full my-8">
          <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
            <div>
              <h3 className="text-2xl font-bold">Seller Dispute Resolution</h3>
              <p className="text-purple-100 mt-1">{dispute.dispute_number || 'N/A'}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[calc(90vh-100px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Status</p>
                <select
                  value={dispute.status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  disabled={isPending || dispute.status === 'resolved'}
                  className="w-full mt-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white font-semibold text-gray-900 capitalize"
                >
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs text-yellow-600 font-semibold uppercase mb-1">Priority</p>
                <select
                  value={dispute.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as any)}
                  disabled={isPending || dispute.status === 'resolved'}
                  className="w-full mt-1 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white font-semibold text-gray-900 capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Type</p>
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <p className="font-semibold text-gray-900 text-sm">{DISPUTE_TYPE_LABELS[dispute.dispute_type]}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-600" />
                Seller Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Business Name</p>
                  <p className="text-sm font-medium text-gray-900">{dispute.seller?.business_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Contact Name</p>
                  <p className="text-sm text-gray-700">{dispute.seller?.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Email</p>
                  <p className="text-sm text-gray-700">{dispute.seller?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">State</p>
                  <p className="text-sm text-gray-700">{dispute.seller?.state}</p>
                </div>
              </div>
            </div>

            {dispute.assigned_to_admin_id && dispute.assigned_to && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Assigned Administrator
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Admin Name</p>
                    <p className="text-sm font-medium text-gray-900">{dispute.assigned_to.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Admin ID</p>
                    <p className="text-sm font-mono font-semibold text-green-700">{dispute.assigned_to.admin_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Role</p>
                    <span className={`inline-flex text-xs px-2 py-1 rounded-full font-semibold ${
                      dispute.assigned_to.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      dispute.assigned_to.role === 'financial_admin' ? 'bg-green-100 text-green-700' :
                      dispute.assigned_to.role === 'support' ? 'bg-blue-100 text-blue-700' :
                      dispute.assigned_to.role === 'moderator' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {dispute.assigned_to.role === 'super_admin' ? 'Super Admin' :
                       dispute.assigned_to.role === 'financial_admin' ? 'Financial Admin' :
                       dispute.assigned_to.role === 'support' ? 'Support' :
                       dispute.assigned_to.role === 'moderator' ? 'Moderator' : 'Admin'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Email</p>
                    <p className="text-sm text-gray-600">{dispute.assigned_to.email}</p>
                  </div>
                  {dispute.assigned_at && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Assigned On</p>
                      <p className="text-sm text-gray-600">{formatDate(dispute.assigned_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-red-50 rounded-xl p-6 border border-red-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Dispute Information
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Title</p>
                  <p className="text-sm font-medium text-gray-900">{dispute.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{dispute.description}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Created</p>
                  <p className="text-sm text-gray-700">{formatDate(dispute.created_at)}</p>
                </div>
              </div>

              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Evidence ({dispute.evidence_urls.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dispute.evidence_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-500 transition"
                      >
                        <img src={url} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold">View Full</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-yellow-600" />
                Admin Notes (Internal)
              </h4>
              <textarea
                value={adminNotesText}
                onChange={(e) => setAdminNotesText(e.target.value)}
                placeholder="Add internal notes about this dispute..."
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 min-h-[100px] bg-white"
                disabled={isPending || dispute.status === 'resolved'}
              />
              <button
                onClick={handleSaveNotes}
                disabled={isPending || dispute.status === 'resolved'}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isPending ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            {/* Internal Notes Section */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <button
                onClick={() => setShowInternalNotes(!showInternalNotes)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Internal Admin Notes</h4>
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                    {internalNotes.length}
                  </span>
                </div>
                <span className="text-sm text-blue-600">
                  {showInternalNotes ? 'Hide' : 'Show'}
                </span>
              </button>

              {showInternalNotes && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-blue-700 mb-3">
                    💡 These notes are only visible to admins and are used for internal coordination.
                  </p>

                  <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                    {internalNotes.length === 0 ? (
                      <p className="text-sm text-gray-500 italic text-center py-4">
                        No internal notes yet
                      </p>
                    ) : (
                      internalNotes.map((note: any) => (
                        <div key={note.id} className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-xs font-semibold text-blue-900">
                              {note.admin?.full_name || 'Admin'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(note.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={newInternalNote}
                      onChange={(e) => setNewInternalNote(e.target.value)}
                      placeholder="Add internal note for other admins..."
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      rows={2}
                      disabled={sendingNote}
                    />
                    <button
                      onClick={handleSendInternalNote}
                      disabled={!newInternalNote.trim() || sendingNote}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingNote ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {dispute.status === 'resolved' && dispute.resolution && (
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Resolution
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">{dispute.resolution}</p>
                  {dispute.resolved_at && (
                    <p className="text-gray-600">Resolved: {formatDate(dispute.resolved_at)}</p>
                  )}
                  {dispute.resolved_by && (
                    <p className="text-gray-600">By: {dispute.resolved_by.full_name}</p>
                  )}
                </div>
              </div>
            )}

            {canResolve && (
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowChatModal(true)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  Open Chat
                </button>
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-semibold"
                >
                  Resolve Dispute
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showResolveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Resolve Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resolution Description *</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Explain the resolution decision..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 min-h-[120px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveDispute}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-semibold disabled:opacity-50"
                >
                  {isPending ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChatModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b bg-purple-600 text-white rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold">Chat with Seller</h3>
              <button onClick={() => setShowChatModal(false)} className="p-1 hover:bg-white/20 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No messages yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, index) => {
                    const isAdmin = msg.sender_type === 'admin';
                    const showDateSeparator = index === 0 || 
                      new Date(messages[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-2">
                            <div className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                              {new Date(msg.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        )}

                        <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${isAdmin ? 'bg-purple-500 text-white' : 'bg-white border'} rounded-lg px-3 py-2`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {msg.attachments.map((url, idx) => {
                                  const isPDF = url.endsWith('.pdf');
                                  return (
                                    <div key={idx}>
                                      {isPDF ? (
                                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                                          <FileText className="h-3 w-3 inline mr-1" />
                                          {getFileName(url)}
                                        </a>
                                      ) : (
                                        <img src={url} alt="Attachment" className="max-w-full rounded cursor-pointer" onClick={() => window.open(url, '_blank')} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <p className="text-xs mt-1 opacity-70">{formatChatDate(msg.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {canResolve && (
              <div className="border-t p-3 bg-white rounded-b-xl">
                {showCannedResponses && (
                  <div className="mb-2 max-h-40 overflow-y-auto bg-white border rounded-lg">
                    {cannedResponses.map((response) => (
                      <button
                        key={response.id}
                        onClick={() => handleCannedResponseSelect(response)}
                        className="w-full text-left p-2 hover:bg-purple-50 text-sm"
                      >
                        <p className="font-medium">{response.title}</p>
                        <p className="text-xs text-gray-600 line-clamp-1">{response.message}</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="bg-purple-50 border rounded px-2 py-1 flex items-center gap-1 text-xs">
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <button onClick={() => removeFile(index)}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={selectedFiles.length >= 5} className="p-2 border rounded-lg hover:bg-gray-50">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button onClick={() => setShowCannedResponses(!showCannedResponses)} className="p-2 border rounded-lg hover:bg-gray-50">
                    <Sparkles className="h-4 w-4" />
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type message..."
                    className="flex-1 p-2 border rounded-lg text-sm resize-none"
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                  >
                    {isSending ? (
                      uploadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}