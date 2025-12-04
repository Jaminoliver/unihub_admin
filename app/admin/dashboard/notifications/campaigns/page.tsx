'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  async function fetchCampaigns() {
    try {
      const url = filter === 'all' 
        ? '/api/admin/notifications/campaigns'
        : `/api/admin/notifications/campaigns?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return;
    
    try {
      await fetch(`/api/admin/notifications/campaigns?id=${id}`, { method: 'DELETE' });
      fetchCampaigns();
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-gray-500">All notification campaigns</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'draft', 'scheduled', 'sent', 'failed'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No campaigns found</div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign: any) => (
                <div key={campaign.id} className="flex justify-between items-start p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{campaign.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{campaign.message}</p>
                    <div className="flex gap-4 mt-3 text-xs text-gray-500">
                      <span>Sent: {campaign.sent_count || 0}</span>
                      <span>Delivered: {campaign.delivered_count || 0}</span>
                      <span>Opened: {campaign.opened_count || 0}</span>
                      <span>Clicked: {campaign.clicked_count || 0}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(campaign.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
                      campaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                      campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                      campaign.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {campaign.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}