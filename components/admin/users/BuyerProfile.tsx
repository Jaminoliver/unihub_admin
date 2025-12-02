'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ban, CheckCircle, Mail, Phone, MapPin } from 'lucide-react';

interface BuyerProfileProps {
  buyer: any;
  onSuspend: (id: string) => void;
  onBan: (id: string) => void;
  onReactivate: (id: string) => void;
}

export function BuyerProfile({ buyer, onSuspend, onBan, onReactivate }: BuyerProfileProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{buyer.full_name}</CardTitle>
            <p className="text-sm text-gray-600">{buyer.email}</p>
          </div>
          <Badge variant={buyer.status === 'active' ? 'default' : 'destructive'}>
            {buyer.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{buyer.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{buyer.university}, {buyer.state}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{buyer.email_verified ? 'Verified' : 'Not Verified'}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {buyer.status === 'active' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onSuspend(buyer.id)}>
                  Suspend
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onBan(buyer.id)}>
                  <Ban className="h-4 w-4 mr-1" />
                  Ban
                </Button>
              </>
            )}
            {buyer.status !== 'active' && (
              <Button variant="outline" size="sm" onClick={() => onReactivate(buyer.id)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Reactivate
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">Order history will load here</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">Activity log will load here</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">Delivery addresses will load here</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}