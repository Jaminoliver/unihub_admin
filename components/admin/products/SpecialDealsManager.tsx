'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Eye, EyeOff, Save, X, Upload, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import {
  getSpecialDeals,
  createSpecialDeal,
  updateSpecialDeal,
  toggleSpecialDealStatus,
  deleteSpecialDeal,
} from '@/app/admin/dashboard/products/actions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SpecialDeal {
  id: string;
  name: string;
  subtitle: string;
  deal_type: string;
  icon_name: string;
  color: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const DEAL_TYPES = [
  { value: 'flash_sale', label: 'Flash Sales' },
  { value: 'discounted', label: 'Discounted' },
  { value: 'last_chance', label: 'Last Chance' },
  { value: 'under_10k', label: 'Under ₦10k' },
  { value: 'top_deals', label: 'Top Deals' },
  { value: 'new_this_week', label: 'New This Week' },
];

const ICON_NAMES = [
  { value: 'bolt', label: '⚡ Bolt' },
  { value: 'local_offer', label: '🏷️ Offer' },
  { value: 'access_time', label: '⏰ Time' },
  { value: 'attach_money', label: '💰 Money' },
  { value: 'star', label: '⭐ Star' },
  { value: 'fiber_new', label: '🆕 New' },
  { value: 'whatshot', label: '🔥 Hot' },
  { value: 'trending_up', label: '📈 Trending' },
  { value: 'shopping_cart', label: '🛒 Cart' },
  { value: 'favorite', label: '❤️ Favorite' },
];

export default function SpecialDealsManager() {
  const [deals, setDeals] = useState<SpecialDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<SpecialDeal | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    deal_type: 'flash_sale',
    icon_name: 'bolt',
    color: '#FF6B35',
    image_url: '',
  });

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    setIsLoading(true);
    try {
      const { specialDeals, error } = await getSpecialDeals();
      if (error) throw new Error(error);
      setDeals(specialDeals);
    } catch (err) {
      console.error('Error loading deals:', err);
      alert('Failed to load special deals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('==================== IMAGE UPLOAD DEBUG ====================');
    console.log('📁 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB'
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large:', file.size, 'bytes');
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Upload directly to root of images bucket

      console.log('📤 Uploading file:', {
        fileName,
        filePath,
        fileExt,
        bucket: 'images'
      });

      console.log('🔧 Supabase client config:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      console.log('📊 Upload result:', {
        success: !uploadError,
        data: uploadData,
        error: uploadError,
        errorMessage: uploadError?.message,
        errorName: uploadError?.name,
        errorStatus: (uploadError as any)?.status,
        errorStatusCode: (uploadError as any)?.statusCode
      });

      if (uploadError) {
        console.error('❌ Upload error details:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      console.log('✅ File uploaded successfully!');
      console.log('🔗 Getting public URL...');

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      console.log('✅ Public URL generated:', publicUrl);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      console.log('✅ Form data updated with image URL');
      console.log('============================================================');
    } catch (err: any) {
      console.error('❌❌❌ CATCH BLOCK ERROR:', err);
      console.error('Error type:', err?.constructor?.name);
      console.error('Error message:', err?.message);
      console.error('Error status:', err?.status);
      console.error('Error statusCode:', err?.statusCode);
      console.error('Full error object:', JSON.stringify(err, null, 2));
      console.log('============================================================');
      alert(`Failed to upload image: ${err.message || err.toString()}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.subtitle.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingDeal) {
        const { error } = await updateSpecialDeal(
          editingDeal.id,
          formData.name,
          formData.subtitle,
          formData.deal_type,
          formData.icon_name,
          formData.color,
          formData.image_url || undefined
        );
        if (error) throw new Error(error);
      } else {
        const { error } = await createSpecialDeal(
          formData.name,
          formData.subtitle,
          formData.deal_type,
          formData.icon_name,
          formData.color,
          formData.image_url || undefined
        );
        if (error) throw new Error(error);
      }

      await loadDeals();
      closeModal();
    } catch (err: any) {
      console.error('Error saving deal:', err);
      alert(`Failed to save deal: ${err.message}`);
    }
  };

  const handleToggleStatus = async (dealId: string, currentStatus: boolean) => {
    try {
      const { error } = await toggleSpecialDealStatus(dealId, !currentStatus);
      if (error) throw new Error(error);
      await loadDeals();
    } catch (err: any) {
      console.error('Error toggling status:', err);
      alert(`Failed to toggle status: ${err.message}`);
    }
  };

  const handleDelete = async (dealId: string, dealName: string) => {
    if (!confirm(`Are you sure you want to delete "${dealName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await deleteSpecialDeal(dealId);
      if (error) throw new Error(error);
      await loadDeals();
    } catch (err: any) {
      console.error('Error deleting deal:', err);
      alert(`Failed to delete deal: ${err.message}`);
    }
  };

  const openEditModal = (deal: SpecialDeal) => {
    setEditingDeal(deal);
    setFormData({
      name: deal.name,
      subtitle: deal.subtitle,
      deal_type: deal.deal_type,
      icon_name: deal.icon_name,
      color: deal.color,
      image_url: deal.image_url || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDeal(null);
    setFormData({
      name: '',
      subtitle: '',
      deal_type: 'flash_sale',
      icon_name: 'bolt',
      color: '#FF6B35',
      image_url: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Special Deals</h2>
              <p className="text-sm text-gray-500">{deals.length} deal sections configured</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDeals}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Deal Section
            </button>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Special Deals Yet</h3>
          <p className="text-gray-500 mb-6">Create your first special deal section to get started</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Deal Section
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Deal Image */}
              <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                {deal.image_url ? (
                  <img
                    src={deal.image_url}
                    alt={deal.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                {/* Color Overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${deal.color}CC, ${deal.color}66)`,
                  }}
                />
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      deal.is_active
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-500 text-white'
                    }`}
                  >
                    {deal.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Deal Info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{deal.name}</h3>
                    <p className="text-sm text-gray-500">{deal.subtitle}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium text-gray-900">
                      {DEAL_TYPES.find(t => t.value === deal.deal_type)?.label || deal.deal_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Icon:</span>
                    <span className="font-medium text-gray-900">{deal.icon_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Color:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: deal.color }}
                      />
                      <span className="font-mono text-xs text-gray-600">{deal.color}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Order:</span>
                    <span className="font-medium text-gray-900">#{deal.sort_order}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleToggleStatus(deal.id, deal.is_active)}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium ${
                      deal.is_active
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {deal.is_active ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(deal)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(deal.id, deal.name)}
                    className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {editingDeal ? 'Edit Deal Section' : 'Add Deal Section'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deal Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Flash Sales"
                  required
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle *
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., Limited time!"
                  required
                />
              </div>

              {/* Deal Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deal Type *
                </label>
                <select
                  value={formData.deal_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_type: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {DEAL_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Maps to ProductService function in Flutter app
                </p>
              </div>

              {/* Icon Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon *
                </label>
                <select
                  value={formData.icon_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {ICON_NAMES.map(icon => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                    placeholder="#FF6B35"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Image
                </label>
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div className="h-full flex flex-col items-center justify-center">
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-3"></div>
                          <p className="text-sm text-gray-500">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-400 mb-3" />
                          <p className="text-sm text-gray-600 font-medium">Click to upload image</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingDeal ? 'Update Deal' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}