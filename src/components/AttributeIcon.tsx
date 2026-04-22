import React from 'react';
import { Dumbbell, Scale, Footprints, Lightbulb, Flame, Scale3d } from 'lucide-react';
import type { AttributeKey } from '../types';

interface Props {
  attr: AttributeKey;
  className?: string;
  size?: number;
}

export const AttributeIcon: React.FC<Props> = ({ attr, className = "", size = 16 }) => {
  switch (attr) {
    case 'power':
      return <Dumbbell size={size} className={`text-orange-600 ${className}`} />;
    case 'balance':
      return <Scale size={size} className={`text-blue-500 ${className}`} />;
    case 'footwork':
      return <Footprints size={size} className={`text-green-600 ${className}`} />;
    case 'technique':
      return <Lightbulb size={size} className={`text-purple-500 ${className}`} />;
    case 'spirit':
      return <Flame size={size} className={`text-red-500 ${className}`} />;
    default:
      return null;
  }
};
