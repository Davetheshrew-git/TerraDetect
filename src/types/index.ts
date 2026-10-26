export interface AiValuation {
  coinType: string;
  ruler: string;
  period: string;
  mintMark: string;
  conditionGrade: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  currency: string;
  confidence: 'High' | 'Moderate' | 'Low';
  referenceMatches: Array<{
    title: string;
    source: string;
    url: string;
    priceNote?: string;
  }>;
  isPotentialTreasure: boolean;
  treasureNotes?: string;
  keyFeatures?: string[];
  summary: string;
}

export interface MetalFind {
  id?: string;
  userId: string;
  userDisplayName?: string;
  title: string;
  depth?: string;
  targetVdi?: string;
  metalType: string;
  customTags: string[];
  notes?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  generalLocation?: string;
  imageUrl?: string;
  aiAnalysis?: AiValuation;
  isPublic?: boolean;
  likesCount?: number;
  nearScheduledMonument?: boolean;
  nearestMonumentName?: string;
  nearestMonumentDistance?: number;
  createdAt: string;
  updatedAt: string;
}

export const COMMON_METALS = [
  'Gold',
  'Silver',
  'Bronze',
  'Copper Alloy',
  'Lead',
  'Pewter',
  'Iron',
  'Billon',
  'Electrum',
  'Potin',
  'Other'
];

export const POPULAR_TAGS = [
  'Hammered Coin',
  'Milled Coin',
  'Roman',
  'Celtic',
  'Anglo-Saxon',
  'Medieval',
  'Tudor',
  'Stuart',
  'Georgian',
  'Victorian',
  'Artefact',
  'Fibula Brooch',
  'Buckle',
  'Seal Matrix',
  'Trade Token',
  'Axehead',
  'Gold Stater',
  'Silver Denarius'
];
