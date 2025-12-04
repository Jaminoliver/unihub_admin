'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';
import { Link2, X, Search, Package, Tag, Gift, ShoppingCart, User, Home } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface SpecialDeal {
  id: string;
  name: string;
  deal_type: string;
}

interface DeepLinkBuilderProps {
  value: string;
  onChange: (link: string) => void;
}

export default function DeepLinkBuilder({ value, onChange }: DeepLinkBuilderProps) {
  const [linkType, setLinkType] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [specialDeals, setSpecialDeals] = useState<SpecialDeal[]>([]);
  const [customLink, setCustomLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
  setLoading(true);
  setError(null);
  
  try {
    console.log('🔄 Fetching categories and special deals...');
    
    // Try fetching with minimal columns first to test connection
    const categoriesRes = await supabase
      .from('categories')
      .select('*')  // ✅ Changed from 'id, name, icon' to '*'
      .order('name');
    
    const dealsRes = await supabase
      .from('special_deals')
      .select('*')  // ✅ Changed to get all columns
      .order('created_at', { ascending: false });

    console.log('📦 Categories response:', categoriesRes);
    console.log('📦 Special deals response:', dealsRes);

    if (categoriesRes.error) {
      console.error('❌ Categories error:', categoriesRes.error);
      // ✅ Check if error has a message property
      const errorMsg = categoriesRes.error?.message || JSON.stringify(categoriesRes.error) || 'Unknown error';
      setError(`Categories error: ${errorMsg}`);
    } else {
      console.log('✅ Categories loaded:', categoriesRes.data?.length || 0);
      console.log('📋 First category:', categoriesRes.data?.[0]); // ✅ Log first item to see structure
      setCategories(categoriesRes.data || []);
    }

    if (dealsRes.error) {
      console.error('❌ Special deals error:', dealsRes.error);
      const errorMsg = dealsRes.error?.message || JSON.stringify(dealsRes.error) || 'Unknown error';
      setError(prev => prev ? `${prev}; Deals error: ${errorMsg}` : `Deals error: ${errorMsg}`);
    } else {
      console.log('✅ Special deals loaded:', dealsRes.data?.length || 0);
      console.log('📋 First deal:', dealsRes.data?.[0]); // ✅ Log first item to see structure
      setSpecialDeals(dealsRes.data || []);
    }
  } catch (error) {
    console.error('❌ Error fetching data:', error);
    setError(`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
}

  function buildLink(type: string, params?: Record<string, string>) {
    let link = '';
    
    switch (type) {
      case 'home':
        link = '/home';
        break;
      case 'category':
        // Format: /category/{categoryId}
        link = `/category/${params?.id}`;
        break;
      case 'special-deal':
        // Format: /special-deals/{dealType}
        link = `/special-deals/${params?.dealType}`;
        break;
      case 'products-search':
        // Format: /search?query={searchQuery}
        link = `/search?query=${encodeURIComponent(params?.query || '')}`;
        break;
      case 'products-state':
        // Format: /products?state={state}
        link = `/products?state=${encodeURIComponent(params?.state || '')}`;
        break;
      case 'orders':
        link = '/orders';
        break;
      case 'cart':
        link = '/cart';
        break;
      case 'profile':
        link = '/profile';
        break;
      case 'wishlist':
        link = '/wishlist';
        break;
      case 'custom':
        link = params?.custom || '';
        break;
    }
    
    console.log(`🔗 Built deep link: ${type} -> ${link}`);
    onChange(link);
    setLinkType(type);
  }

  function clearLink() {
    onChange('');
    setLinkType('');
    setCustomLink('');
    setSearchQuery('');
    setSelectedState('');
  }

  const linkOptions = [
    { id: 'home', label: 'Home Screen', icon: Home, color: 'blue' },
    { id: 'category', label: 'Category', icon: Tag, color: 'purple' },
    { id: 'special-deal', label: 'Special Deal', icon: Gift, color: 'red' },
    { id: 'products-search', label: 'Product Search', icon: Search, color: 'green' },
    { id: 'products-state', label: 'Products by State', icon: Package, color: 'orange' },
    { id: 'orders', label: 'My Orders', icon: ShoppingCart, color: 'pink' },
    { id: 'cart', label: 'Shopping Cart', icon: ShoppingCart, color: 'yellow' },
    { id: 'profile', label: 'Profile', icon: User, color: 'indigo' },
    { id: 'wishlist', label: 'Wishlist', icon: Package, color: 'teal' },
    { id: 'custom', label: 'Custom Link', icon: Link2, color: 'gray' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Deep Link (optional)</Label>
        {value && (
          <Button variant="ghost" size="sm" onClick={clearLink}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
          <button 
            onClick={fetchData}
            className="text-xs text-red-600 underline mt-1"
          >
            Retry
          </button>
        </div>
      )}

      {/* Current Link Display */}
      {value && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          <code className="text-sm text-blue-700 flex-1">{value}</code>
        </div>
      )}

      {/* Link Type Selector */}
      {!linkType && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {linkOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => {
                  if (option.id === 'home' || option.id === 'orders' || option.id === 'cart' || option.id === 'profile' || option.id === 'wishlist') {
                    buildLink(option.id);
                  } else {
                    setLinkType(option.id);
                  }
                }}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <Icon className={`w-5 h-5 text-${option.color}-600 mb-2`} />
                <p className="font-medium text-sm">{option.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Category Selector */}
      {linkType === 'category' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Select a category to link to:</p>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No categories found.</p>
              <button 
                onClick={fetchData}
                className="text-sm text-blue-600 underline mt-2"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => buildLink('category', { id: cat.id, name: cat.name })}
                  className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition text-left"
                >
                  <p className="font-medium text-sm">{cat.icon} {cat.name}</p>
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setLinkType('')}>
            ← Back
          </Button>
        </div>
      )}

      {/* Special Deal Selector */}
      {linkType === 'special-deal' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Select a special deal to link to:</p>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading deals...</p>
            </div>
          ) : specialDeals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No special deals found. Create one first.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {specialDeals.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => buildLink('special-deal', { dealType: deal.deal_type })} 
                  className="w-full p-3 border rounded-lg hover:bg-red-50 hover:border-red-500 transition text-left"
                >
                  <p className="font-medium text-sm">{deal.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{deal.deal_type}</p>
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setLinkType('')}>
            ← Back
          </Button>
        </div>
      )}

      {/* Product Search */}
      {linkType === 'products-search' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Enter search query:</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., iPhone, laptops, shoes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  buildLink('products-search', { query: searchQuery });
                }
              }}
            />
            <Button 
              onClick={() => searchQuery && buildLink('products-search', { query: searchQuery })}
              disabled={!searchQuery}
            >
              Set
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLinkType('')}>
            ← Back
          </Button>
        </div>
      )}

      {/* Products by State */}
      {linkType === 'products-state' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Select state:</p>
          <select
            className="w-full border rounded-lg p-3"
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              if (e.target.value) {
                buildLink('products-state', { state: e.target.value });
              }
            }}
          >
            <option value="">Select state...</option>
            <option value="Lagos">Lagos</option>
            <option value="Abuja">Abuja</option>
            <option value="Kano">Kano</option>
            <option value="Rivers">Rivers</option>
            <option value="Oyo">Oyo</option>
            <option value="Edo">Edo</option>
            <option value="Delta">Delta</option>
            <option value="Kaduna">Kaduna</option>
            <option value="Enugu">Enugu</option>
            <option value="Ogun">Ogun</option>
            <option value="Osun">Osun</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => setLinkType('')}>
            ← Back
          </Button>
        </div>
      )}

      {/* Custom Link */}
      {linkType === 'custom' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Enter custom deep link path:</p>
          <div className="flex gap-2">
            <Input
              placeholder="/products?category=electronics"
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && customLink) {
                  buildLink('custom', { custom: customLink });
                }
              }}
            />
            <Button 
              onClick={() => customLink && buildLink('custom', { custom: customLink })}
              disabled={!customLink}
            >
              Set
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLinkType('')}>
            ← Back
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Deep links open specific pages in your app when users tap the notification
      </p>
    </div>
  );
}