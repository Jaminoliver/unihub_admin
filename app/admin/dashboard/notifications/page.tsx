'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Send, FileText, BarChart3, Plus } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await fetch('/api/admin/notifications/analytics?days=7');
      const data = await res.json();
      setStats(data.stats);
      setRecentCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-gray-500">Send push notifications to users</p>
        </div>
        <Button onClick={() => router.push('/admin/dashboard/notifications/compose')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Notification
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push('/admin/dashboard/notifications/compose')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compose</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Create new notification</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push('/admin/dashboard/notifications/campaigns')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Bell className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Manage campaigns</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push('/admin/dashboard/notifications/templates')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Saved templates</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition" onClick={() => router.push('/admin/dashboard/notifications/analytics')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analytics</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">View performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
       <Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-gray-500">Total Sent (7 days)</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{loading ? '...' : (stats?.totalSent || 0).toLocaleString()}</div>
  </CardContent>
</Card>

<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-gray-500">Delivery Rate</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-green-600">{loading ? '...' : `${(stats?.deliveryRate || 0).toFixed(1)}%`}</div>
  </CardContent>
</Card>

<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-gray-500">Open Rate</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-blue-600">{loading ? '...' : `${(stats?.openRate || 0).toFixed(1)}%`}</div>
  </CardContent>
</Card>

<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-gray-500">Click Rate</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-purple-600">{loading ? '...' : `${(stats?.clickRate || 0).toFixed(1)}%`}</div>
  </CardContent>
</Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>Latest notification campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No campaigns yet</div>
          ) : (
            <div className="space-y-4">
              {recentCampaigns.map((campaign: any) => (
                <div key={campaign.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h3 className="font-medium">{campaign.title}</h3>
                    <p className="text-sm text-gray-500">{campaign.message}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Sent: {campaign.sent_count || 0}</span>
                      <span>Delivered: {campaign.delivered_count || 0}</span>
                      <span>Opened: {campaign.opened_count || 0}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
                      campaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                      campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {campaign.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
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