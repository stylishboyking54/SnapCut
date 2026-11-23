import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://snapcut.vip';

  // Core public canonical routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamically include verified public shops
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || 'https://snapcut-599t.onrender.com/api';
    const res = await fetch(`${apiBase}/shops`, {
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const shops = await res.json();
      if (Array.isArray(shops)) {
        const shopRoutes: MetadataRoute.Sitemap = shops.map((shop: any) => ({
          url: `${baseUrl}/shops/${shop.id}`,
          lastModified: shop.created_at ? new Date(shop.created_at) : new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
        }));
        return [...staticRoutes, ...shopRoutes];
      }
    }
  } catch (err) {
    console.warn('[Sitemap] Could not fetch shops for sitemap:', err);
  }

  return staticRoutes;
}
