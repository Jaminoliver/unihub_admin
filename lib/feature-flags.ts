import { createClient } from '@/lib/supabase/client';

// Cache for feature flags (60 seconds)
let flagCache: Record<string, boolean> = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

/**
 * Check if a feature flag is enabled
 * Uses client-side caching to reduce database calls
 */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  // Check cache first
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_DURATION && flagKey in flagCache) {
    return flagCache[flagKey];
  }

  // Fetch from database
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('is_enabled')
      .eq('flag_key', flagKey)
      .single();

    if (error) {
      console.error(`Error fetching feature flag ${flagKey}:`, error);
      return false;
    }

    // Update cache
    flagCache[flagKey] = data?.is_enabled ?? false;
    cacheTimestamp = now;

    return data?.is_enabled ?? false;
  } catch (error) {
    console.error(`Error checking feature flag ${flagKey}:`, error);
    return false;
  }
}

/**
 * Get all feature flags (for admin dashboard)
 */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('flag_key, is_enabled');

    if (error) throw error;

    const flags: Record<string, boolean> = {};
    data?.forEach((flag) => {
      flags[flag.flag_key] = flag.is_enabled;
    });

    // Update cache
    flagCache = flags;
    cacheTimestamp = Date.now();

    return flags;
  } catch (error) {
    console.error('Error fetching all feature flags:', error);
    return {};
  }
}

/**
 * Clear the feature flags cache
 * Call this after toggling flags in admin panel
 */
export function clearFeatureFlagCache() {
  flagCache = {};
  cacheTimestamp = 0;
}

/**
 * Feature flag keys (for type safety)
 */
export const FeatureFlags = {
  SPECIAL_DEALS: 'enable_special_deals',
  WISHLIST: 'enable_wishlist',
  REVIEWS: 'enable_reviews',
  CHAT: 'enable_chat',
  REFERRALS: 'enable_referrals',
  MAINTENANCE_MODE: 'maintenance_mode',
} as const;