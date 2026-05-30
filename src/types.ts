export interface BusinessProfile {
  id: string;
  userId: string;
  productName: string;
  targetAudience: string;
  businessCategory?: string;
  tone?: string;
  createdAt: Date | string;
}

export interface ContentDay {
  day: number;
  theme: string;
  visual_concept: string;
  caption: string;
  hashtags: string[];
}

export interface SavedCalendar {
  id: string;
  userId: string;
  productName: string;
  targetAudience: string;
  businessCategory?: string;
  tone?: string;
  items: ContentDay[];
  createdAt: string;
}
