export interface Activity {
  id: string;
  name: string;
  category: 'transport' | 'food' | 'energy' | 'lifestyle';
  unit: string;
  emissionFactor: number; // kg CO2 per unit
  icon: string;
}

export interface UserActivity {
  activityId: string;
  value: number;
}

export interface Recommendation {
  activityId: string;
  alternativeName: string;
  alternativeFactor: number;
  description: string;
}

export interface FootprintResult {
  total: number;
  byCategory: Record<string, number>;
  savings: {
    activityId: string;
    original: number;
    reduced: number;
    potentialSaving: number;
    recommendation: string;
  }[];
}
