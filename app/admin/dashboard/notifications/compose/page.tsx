'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send, Calendar, X, ImageIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import DeepLinkBuilder from '@/components/admin/notifications/DeepLinkBuilder';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface State {
  id: string;
  name: string;
}

interface University {
  id: string;
  name: string;
  state: string;
}

export default function ComposePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const [form, setForm] = useState({
    title: '',
    message: '',
    imageUrl: '',
    deepLink: '',
    targetAllUsers: true,
    targetStates: [] as string[],
    targetUniversities: [] as string[],
    targetUserTypes: [] as string[],
    scheduleTime: '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    const { data: statesData } = await supabase
      .from('states')
      .select('id, name')
      .order('name');
    
    const { data: uniData } = await supabase
      .from('universities')
      .select('id, name, state')
      .order('name');
    
    setStates(statesData || []);
    setUniversities(uniData || []);
  }

  const filteredUniversities = form.targetStates.length > 0
    ? universities.filter(u => form.targetStates.includes(u.state))
    : universities;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📸 Image selected:', file.name, file.size, file.type);

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    console.log('✅ Image set for upload');
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) {
      console.log('⏭️ No image file to upload');
      return form.imageUrl || null;
    }

    console.log('📤 Starting image upload...');
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      console.log('🌐 Sending to /api/admin/notifications/upload');

      const res = await fetch('/api/admin/notifications/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Upload response status:', res.status);

      if (!res.ok) {
        const error = await res.json();
        console.error('❌ Upload failed:', error);
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      console.log('✅ Upload successful:', data.url);
      return data.url;
    } catch (error: any) {
      console.error('💥 Upload error:', error);
      alert('Failed to upload image: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview('');
    setForm({ ...form, imageUrl: '' });
    console.log('🗑️ Image removed');
  }

  function addState(stateName: string) {
    if (!form.targetStates.includes(stateName)) {
      setForm({ ...form, targetStates: [...form.targetStates, stateName] });
    }
  }

  function removeState(stateName: string) {
    setForm({
      ...form,
      targetStates: form.targetStates.filter(s => s !== stateName),
      targetUniversities: form.targetUniversities.filter(u => {
        const uni = universities.find(uni => uni.name === u);
        return uni?.state !== stateName;
      })
    });
  }

  function addUniversity(uniName: string) {
    if (!form.targetUniversities.includes(uniName)) {
      setForm({ ...form, targetUniversities: [...form.targetUniversities, uniName] });
    }
  }

  function removeUniversity(uniName: string) {
    setForm({
      ...form,
      targetUniversities: form.targetUniversities.filter(u => u !== uniName)
    });
  }

  async function handleSend() {
    if (!form.title || !form.message) {
      alert('Title and message are required');
      return;
    }

    console.log('🚀 Starting send process...');
    console.log('📸 Image file:', imageFile);
    console.log('🖼️ Image preview:', imagePreview);

    setLoading(true);
    try {
      console.log('📤 Calling uploadImage...');
      const uploadedImageUrl = await uploadImage();
      console.log('✅ Upload result:', uploadedImageUrl);

      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          imageUrl: uploadedImageUrl,
          deepLink: form.deepLink,
          targetAudience: {
            all_users: form.targetAllUsers,
            states: form.targetStates,
            universities: form.targetUniversities,
            user_types: form.targetUserTypes,
          },
          scheduleTime: form.scheduleTime || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Notification ${form.scheduleTime ? 'scheduled' : 'sent'} successfully!\n\nSent to: ${data.sentCount} users\nDelivered: ${data.deliveredCount} users`);
        router.push('/admin/dashboard/notifications');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send notification');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Compose Notification</h1>
          <p className="text-gray-500">Create and send push notifications to users</p>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Content</CardTitle>
          <CardDescription>What will users see in their notification?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              placeholder="🔥 50% Off Electronics This Week!"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{form.title.length}/100 characters</p>
          </div>

          <div>
            <Label>Message *</Label>
            <Textarea
              placeholder="Limited time offer! Get huge discounts on all electronics. Shop now before stocks run out!"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-1">{form.message.length}/300 characters</p>
          </div>

          <div>
            <Label>Notification Image (optional)</Label>
            <div className="mt-2">
              {!imagePreview && !form.imageUrl ? (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload image</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG or JPEG (max 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageUpload}
                  />
                </label>
              ) : (
                <div className="relative w-full h-40 border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview || form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Rich notification with banner image</p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation with Deep Link Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation</CardTitle>
          <CardDescription>Where should users go when they tap the notification?</CardDescription>
        </CardHeader>
        <CardContent>
          <DeepLinkBuilder
            value={form.deepLink}
            onChange={(link) => setForm({ ...form, deepLink: link })}
          />
        </CardContent>
      </Card>

      {/* Targeting */}
      <Card>
        <CardHeader>
          <CardTitle>Target Audience</CardTitle>
          <CardDescription>Who should receive this notification?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* All Users Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <Label className="text-base font-semibold">Send to All Users</Label>
              <p className="text-sm text-gray-600 mt-1">Broadcast to everyone on the platform</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.targetAllUsers}
                onChange={(e) => setForm({
                  ...form,
                  targetAllUsers: e.target.checked,
                  targetStates: [],
                  targetUniversities: [],
                  targetUserTypes: []
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {!form.targetAllUsers && (
            <>
              {/* User Types */}
              <div>
                <Label className="text-base font-semibold">User Type</Label>
                <p className="text-sm text-gray-600 mb-3">Select buyer, seller, or both</p>
                <div className="flex gap-3">
                  {['buyer', 'seller'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        const types = form.targetUserTypes.includes(type)
                          ? form.targetUserTypes.filter(t => t !== type)
                          : [...form.targetUserTypes, type];
                        setForm({ ...form, targetUserTypes: types });
                      }}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium capitalize transition ${
                        form.targetUserTypes.includes(type)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {type}s
                    </button>
                  ))}
                </div>
              </div>

              {/* States */}
              <div>
                <Label className="text-base font-semibold">States</Label>
                <p className="text-sm text-gray-600 mb-3">Select specific states (optional)</p>
                
                {form.targetStates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                    {form.targetStates.map((state) => (
                      <span
                        key={state}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {state}
                        <button
                          onClick={() => removeState(state)}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <select
                  className="w-full border rounded-lg p-3"
                  onChange={(e) => {
                    if (e.target.value) {
                      addState(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">+ Add state</option>
                  {states
                    .filter(s => !form.targetStates.includes(s.name))
                    .map((state) => (
                      <option key={state.id} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Universities */}
              <div>
                <Label className="text-base font-semibold">Universities</Label>
                <p className="text-sm text-gray-600 mb-3">
                  {form.targetStates.length > 0
                    ? `Select universities in ${form.targetStates.join(', ')}`
                    : 'Select specific universities (optional)'}
                </p>
                
                {form.targetUniversities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                    {form.targetUniversities.map((uni) => (
                      <span
                        key={uni}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                      >
                        {uni}
                        <button
                          onClick={() => removeUniversity(uni)}
                          className="hover:bg-green-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <select
                  className="w-full border rounded-lg p-3"
                  onChange={(e) => {
                    if (e.target.value) {
                      addUniversity(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">+ Add university</option>
                  {filteredUniversities
                    .filter(u => !form.targetUniversities.includes(u.name))
                    .map((uni) => (
                      <option key={uni.id} value={uni.name}>
                        {uni.name} ({uni.state})
                      </option>
                    ))}
                </select>
              </div>

              {/* Audience Summary */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-sm text-yellow-800 mb-2">Targeting Summary:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• User types: {form.targetUserTypes.length > 0 ? form.targetUserTypes.join(', ') : 'All'}</li>
                  <li>• States: {form.targetStates.length > 0 ? form.targetStates.join(', ') : 'All'}</li>
                  <li>• Universities: {form.targetUniversities.length > 0 ? `${form.targetUniversities.length} selected` : 'All'}</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduling (optional)</CardTitle>
          <CardDescription>Send immediately or schedule for later</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Schedule Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.scheduleTime}
              onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.scheduleTime ? `Scheduled for ${new Date(form.scheduleTime).toLocaleString()}` : 'Leave empty to send immediately'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 sticky bottom-0 bg-white p-4 border-t">
        <Button
          onClick={handleSend}
          disabled={loading || uploading}
          className="flex-1 h-12 text-base"
        >
          {loading || uploading ? (
            uploading ? 'Uploading image...' : 'Sending...'
          ) : form.scheduleTime ? (
            <><Calendar className="w-5 h-5 mr-2" /> Schedule Notification</>
          ) : (
            <><Send className="w-5 h-5 mr-2" /> Send Now</>
          )}
        </Button>
        <Button variant="outline" onClick={() => router.back()} className="h-12">
          Cancel
        </Button>
      </div>
    </div>
  );
}