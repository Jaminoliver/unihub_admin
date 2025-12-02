'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, TrendingUp, Users, Package } from 'lucide-react';

export function ReportsCenter() {
  const reports = [
    { name: 'Daily Sales Summary', description: 'Sales and revenue for today', icon: TrendingUp },
    { name: 'Weekly Revenue Report', description: 'Comprehensive weekly analysis', icon: TrendingUp },
    { name: 'Monthly Commission Report', description: 'All commissions for the month', icon: FileText },
    { name: 'User Growth Report', description: 'New signups and user metrics', icon: Users },
    { name: 'Product Performance', description: 'Top products and categories', icon: Package },
    { name: 'Escrow Status Report', description: 'All active escrow holds', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pre-built Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.name}
                  className="border rounded-lg p-4 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-gray-600">{report.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Report Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">Coming soon: Build custom reports with filters and metrics</p>
          <Button disabled>Build Custom Report</Button>
        </CardContent>
      </Card>
    </div>
  );
}