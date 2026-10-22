import { BookOpen, Brain, CheckSquare, Dumbbell, Folder, FolderKanban, Heart, Leaf, Moon, Sparkles, Star, Sun, Target, Wallet, type LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  check: CheckSquare, folder: FolderKanban, target: Target, book: BookOpen,
  sparkles: Sparkles, heart: Heart, dumbbell: Dumbbell, wallet: Wallet, moon: Moon,
  sun: Sun, star: Star, leaf: Leaf, brain: Brain,
};
export const iconFor = (name?: string): LucideIcon => (name && MAP[name]) || Folder;
