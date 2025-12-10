'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, AlertCircle, CheckCircle, MessageSquare, Shield, Paperclip, Image as ImageIcon, FileText, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

interface SellerDispute {
  id: string;
  dispute_type: string;
  title: string;
  description: string;
  evidence_urls: string[] | null;
  status: string;
  priority: string;
  admin_notes: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  seller: {
    business_name: string;
    full_name: string;
    email: string;
  };
}

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

interface SellerDisputeDetailsAdminProps {
  dispute: SellerDispute;
  onClose: () => void;
  onUpdate: () => void;
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

export function SellerDisputeDetailsAdmin({ dispute, onClose, onUpdate }: SellerDisputeDetailsAdminProps) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [adminNotes, setAdminNotes] = useState(dispute.admin_notes || '');
  const [resolution, setResolution] = useState(dispute.resolution || '');
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadMessages();
    loadCannedResponses();
  }, [dispute.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('seller_dispute_messages')
        .select('*')
        .eq('seller_dispute_id', dispute.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
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
        
        const fileName = `seller-disputes/${dispute.id}/${Date.now()}-${file.name}`;
        
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
          seller_dispute_id: dispute.id,
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

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes.trim() || null,
      };

      if (newStatus === 'resolved') {
        if (!resolution.trim()) {
          alert('Please provide a resolution before closing the dispute');
          setIsUpdating(false);
          return;
        }
        updateData.resolution = resolution.trim();
        updateData.resolved_by_admin_id = user.id;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('seller_disputes')
        .update(updateData)
        .eq('id', dispute.id);

      if (error) throw error;

      alert(`Dispute ${newStatus === 'resolved' ? 'resolved' : 'updated'} successfully!`);
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(`Failed to update dispute: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  const canReply = dispute.status !== 'resolved' && dispute.status !== 'closed';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-6xl w-full my-8 flex flex-col max-h-[95vh]">
        {/* Header - ULTRA COMPACT */}
        <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-purple-500 text-white flex-shrink-0 py-1.5 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <div>
                <CardTitle className="text-sm font-semibold leading-tight">Seller Dispute</CardTitle>
                <p className="text-xs text-white/80 leading-tight">{DISPUTE_TYPE_LABELS[dispute.dispute_type]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs py-0 px-2 ${
                dispute.status === 'open' ? 'bg-amber-100 text-amber-800' :
                dispute.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {dispute.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20 h-7 w-7 p-0 rounded-full"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Side: Chat */}
          <div className="flex-1 flex flex-col border-r">
            {/* Context - MINIMAL */}
            <div className="bg-orange-50 border-b border-orange-200 px-3 py-1 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs">
                <AlertCircle className="h-3 w-3 text-orange-600 flex-shrink-0" />
                <span className="font-semibold text-orange-900 truncate flex-1">{dispute.title}</span>
                <Badge className={`text-xs py-0 px-1.5 ${
                  dispute.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                  dispute.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {dispute.priority}
                </Badge>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-xs text-gray-600">Loading...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">No messages</h3>
                    <p className="text-xs text-gray-600">Start conversation</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-w-3xl mx-auto">
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
                          <div className={`flex items-end gap-1.5 max-w-[75%] ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
                              isAdmin ? 'bg-purple-500' : 'bg-green-500'
                            }`}>
                              {isAdmin ? 'A' : 'S'}
                            </div>

                            <div>
                              <div className={`rounded-xl px-3 py-1.5 ${
                                isAdmin ? 'bg-purple-500 text-white' : 'bg-white border border-gray-200'
                              }`}>
                                {!isAdmin && (
                                  <p className="text-xs font-semibold mb-0.5 text-gray-900">Seller</p>
                                )}
                                <p className={`text-sm whitespace-pre-wrap break-words ${
                                  isAdmin ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {msg.message}
                                </p>

                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-1.5 space-y-1.5">
                                    {msg.attachments.map((url, idx) => {
                                      const isPDF = url.endsWith('.pdf');
                                      return (
                                        <div key={idx}>
                                          {isPDF ? (
                                            <a 
                                              href={url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className={`flex items-center gap-1.5 p-1.5 rounded text-xs ${
                                                isAdmin ? 'bg-purple-600' : 'bg-gray-100'
                                              }`}
                                            >
                                              <FileText className={`h-3 w-3 ${isAdmin ? 'text-white' : 'text-gray-600'}`} />
                                              <span className={`${isAdmin ? 'text-white' : 'text-gray-600'} truncate`}>
                                                {getFileName(url)}
                                              </span>
                                            </a>
                                          ) : (
                                            <img 
                                              src={url} 
                                              alt="Attachment" 
                                              className="max-w-full rounded cursor-pointer hover:opacity-90 max-h-48 object-cover"
                                              onClick={() => window.open(url, '_blank')}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <p className={`text-xs text-gray-500 mt-0.5 px-1 ${isAdmin ? 'text-right' : 'text-left'}`}>
                                {formatDate(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            {canReply && (
              <div className="border-t bg-white p-2 flex-shrink-0">
                {showCannedResponses && (
                  <div className="mb-2 max-h-40 overflow-y-auto bg-white border border-purple-300 rounded-lg shadow-lg">
                    <div className="p-1.5">
                      <p className="text-xs font-semibold text-purple-900 mb-1 px-1.5">Templates</p>
                      {cannedResponses.map((response) => (
                        <button
                          key={response.id}
                          onClick={() => handleCannedResponseSelect(response)}
                          className="w-full text-left p-1.5 hover:bg-purple-50 rounded transition-colors"
                        >
                          <p className="text-xs font-medium text-gray-900">{response.title}</p>
                          <p className="text-xs text-gray-600 line-clamp-1">{response.message}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="bg-purple-50 border border-purple-200 rounded px-2 py-1 flex items-center gap-1.5">
                        {file.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 text-purple-600" /> : <FileText className="h-3 w-3 text-purple-600" />}
                        <span className="text-xs text-purple-900 max-w-[100px] truncate">{file.name}</span>
                        <button onClick={() => removeFile(index)} className="text-purple-600 hover:text-purple-800">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending || selectedFiles.length >= 5}
                    className="h-8 w-8 p-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCannedResponses(!showCannedResponses)}
                    disabled={isSending}
                    className="h-8 w-8 p-0"
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type message..."
                    className="flex-1 p-2 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 text-sm"
                    rows={1}
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending}
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600 h-8 w-8 p-0"
                  >
                    {isSending ? (
                      uploadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Actions */}
          <div className="w-72 bg-gray-50 p-2 overflow-y-auto">
            <div className="space-y-2">
              <div className="bg-white rounded p-2 border text-xs">
                <p className="font-semibold text-gray-900 mb-1">Seller</p>
                <p className="text-gray-600">{dispute.seller.business_name || dispute.seller.full_name}</p>
              </div>

              <div className="bg-white rounded p-2 border">
                <label className="block text-xs font-semibold text-gray-900 mb-1">Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Private..."
                  rows={2}
                  disabled={dispute.status === 'resolved'}
                  className="text-xs"
                />
              </div>

              {canReply && (
                <div className="bg-white rounded p-2 border">
                  <label className="block text-xs font-semibold text-gray-900 mb-1">Resolution</label>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Explain..."
                    rows={3}
                    className="text-xs"
                  />
                </div>
              )}

              {dispute.status === 'resolved' && dispute.resolution && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <h4 className="font-semibold text-green-900 text-xs">Resolved</h4>
                  </div>
                  <p className="text-xs text-green-800">{dispute.resolution}</p>
                </div>
              )}

              <div className="space-y-1.5">
                {dispute.status === 'open' && (
                  <Button
                    onClick={() => handleUpdateStatus('under_review')}
                    disabled={isUpdating}
                    size="sm"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-xs h-8"
                  >
                    Under Review
                  </Button>
                )}
                {canReply && (
                  <Button
                    onClick={() => handleUpdateStatus('resolved')}
                    disabled={isUpdating || !resolution.trim()}
                    size="sm"
                    className="w-full bg-green-500 hover:bg-green-600 text-xs h-8"
                  >
                    {isUpdating ? 'Resolving...' : 'Resolve'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}