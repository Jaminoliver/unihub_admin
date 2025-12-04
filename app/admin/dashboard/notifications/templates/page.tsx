'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, MousePointer, Eye } from 'lucide-react';

interface Stats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

interface Campaign {
  id: string;
  title: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  sent_at: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  async function fetchAnalytics() {
    try {
      const res = await fetch(`/api/admin/notifications/analytics?days=${days}`);
      const data = await res.json();
      setStats(data.stats);
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-gray-500">Notification performance metrics</p>
          </div>
        </div>

        {/* Time filter */}
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d} days
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Last {days} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : `${stats.deliveryRate.toFixed(1)}%`}
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.delivered.toLocaleString()} delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '...' : `${stats.openRate.toFixed(1)}%`}
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.opened.toLocaleString()} opened</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? '...' : `${stats.clickRate.toFixed(1)}%`}
            </div>
            <p className="text-xs text-gray-500 mt-1">{stats.clicked.toLocaleString()} clicked</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Top performing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No campaigns yet</div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const deliveryRate = campaign.sent_count > 0
                  ? (campaign.delivered_count / campaign.sent_count) * 100
                  : 0;
                const openRate = campaign.delivered_count > 0
                  ? (campaign.opened_count / campaign.delivered_count) * 100
                  : 0;
                const clickRate = campaign.opened_count > 0
                  ? (campaign.clicked_count / campaign.opened_count) * 100
                  : 0;

                return (
                  <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                    <div>
                      <h3 className="font-medium">{campaign.title}</h3>
                      <p className="text-xs text-gray-500">
                        {new Date(campaign.sent_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Sent</p>
                        <p className="font-medium">{campaign.sent_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Delivered</p>
                        <p className="font-medium text-green-600">{deliveryRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Opened</p>
                        <p className="font-medium text-blue-600">{openRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Clicked</p>
                        <p className="font-medium text-purple-600">{clickRate.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${deliveryRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12">Delivery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${openRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12">Open</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${clickRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12">Click</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}