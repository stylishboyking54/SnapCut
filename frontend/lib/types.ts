export interface Service {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  description?: string;
}

export interface BreakBlock {
  id: string;
  startTime: string; // "14:00"
  endTime: string;   // "15:00"
  reason: string;    // "Lunch & Rest", "Equipment Maintenance"
  isRecurring: boolean;
}

export interface WorkingHour {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ...
  dayName: string;
  startTime: string;
  endTime: string;
  isOpen: boolean;
}

export type ShopType = 'barber' | 'salon';

export interface Shop {
  id: string;
  name: string;
  tagline: string;
  ownerName: string;
  address: string;
  city: string;
  /** barber = men, salon = women */
  shopType: ShopType;
  distanceKm: number;
  lat: number;
  lng: number;
  phone: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  isEmergency: boolean;
  isVerified?: boolean;
  emergencyReason?: string;
  resumeAt?: string;
  avgDurationPerClient: number; // minutes
  chairCount?: number;
  currentQueueCount: number;
  estimatedWaitMinutes: number;
  coverImage: string;
  cover_image_url?: string[] | string;
  photos?: string[];
  services: Service[];
  workingHours: WorkingHour[];
  breaks: BreakBlock[];
}

export interface QueueItem {
  id: string;
  shopId: string;
  shopName: string;
  shopAddress?: string;
  shopLat?: number;
  shopLng?: number;
  customerName: string;
  customerAvatar?: string;
  customerPhone?: string;
  serviceName: string;
  serviceDuration: number;
  price: number;
  queuePosition: number;
  estimatedWaitMinutes: number;
  scheduledTime: string; // e.g. "15:30"
  scheduledAt?: string; // ISO date-time string e.g. "2026-11-20T10:00:00.000Z"
  status: 'in_progress' | 'waiting' | 'completed' | 'cancelled' | 'shifted';
  notes?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'queue_update' | 'emergency' | 'shifted' | 'reminder';
  timestamp: string;
  isRead: boolean;
  shopName?: string;
  actionUrl?: string;
}
