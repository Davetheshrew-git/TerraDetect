/**
 * TerraDetect UK — Domain Types & Heritage Constants
 */

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

/**
 * Helper to determine if a find qualifies for UK Treasure Act 1996 review
 */
export function isPreciousTreasureCandidate(find: Pick<MetalFind, 'metalType' | 'customTags'>): boolean {
  const metal = (find.metalType || '').toLowerCase();
  if (metal.includes('gold') || metal.includes('silver') || metal.includes('electrum')) {
    return true;
  }
  if (metal.includes('bronze') && find.customTags?.some(t => t.toLowerCase().includes('hoard') || t.toLowerCase().includes('axehead'))) {
    return true;
  }
  return false;
}
