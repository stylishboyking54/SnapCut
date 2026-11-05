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
  emergencyReason?: string;
  avgDurationPerClient: number; // minutes
  currentQueueCount: number;
  estimatedWaitMinutes: number;
  coverImage: string;
  services: Service[];
  workingHours: WorkingHour[];
  breaks: BreakBlock[];
}

export interface QueueItem {
  id: string;
  shopId: string;
  shopName: string;
  customerName: string;
  customerAvatar?: string;
  serviceName: string;
  serviceDuration: number;
  price: number;
  queuePosition: number;
  estimatedWaitMinutes: number;
  scheduledTime: string; // e.g. "15:30"
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
