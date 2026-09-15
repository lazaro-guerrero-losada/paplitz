export type AvatarMood =
  | 'neutral'
  | 'curious'
  | 'drawing'
  | 'success-stars'
  | 'fail-spiral'
  | 'speed-lightning'
  | 'streak-fire'
  | 'sleepy'
  | 'surprised'
  | 'wink'
  | 'poked';

export interface CosmeticItem {
  id: string;
  name: string;
  category: 'hat' | 'glasses' | 'badge' | 'aura';
  priceXP: number;
  description: string;
  unlocked: boolean;
}

export interface EquippedCosmetics {
  hat?: string;
  glasses?: string;
  badge?: string;
  aura?: string;
}

export const DEFAULT_COSMETICS: CosmeticItem[] = [
  {
    id: 'beret',
    name: 'Boina de Mangaka',
    category: 'hat',
    priceXP: 100,
    description: 'La clásica boina de dibujante tradicional de manga.',
    unlocked: false,
  },
  {
    id: 'monocle',
    name: 'Monóculo de Perspectiva',
    category: 'glasses',
    priceXP: 250,
    description: 'Alinea los puntos de fuga con precisión milimétrica.',
    unlocked: false,
  },
  {
    id: 'star_badge',
    name: 'Broche Estrella',
    category: 'badge',
    priceXP: 150,
    description: 'Insignia otorgada a los dibujantes perseverantes.',
    unlocked: false,
  },
  {
    id: 'ink_aura',
    name: 'Aura de Tinta',
    category: 'aura',
    priceXP: 400,
    description: 'Gotas de tinta negra técnica que orbitan alrededor del cubo.',
    unlocked: false,
  },
];
