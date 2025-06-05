import React, { useState } from 'react';
import { DigimonType, DigimonAttribute } from '../stores/battleStore';
import PixelatedImage from './PixelatedImage';
import { View } from 'react-native';
import { ThemedText } from './ThemedText';

interface TypeAttributeIconProps {
  type: DigimonType;
  attribute: DigimonAttribute;
  size?: 'sm' | 'md' | 'lg' | 'xs';
  showLabel?: boolean;
  className?: string;
  showTooltip?: boolean;
}

const TypeAttributeIcon: React.FC<TypeAttributeIconProps> = ({ 
  type, 
  attribute, 
  size = 'md',
  showLabel = false,
  className = '',
  showTooltip = false
}) => {
  // State to control tooltip position
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  
  // Normalize inputs to handle case inconsistencies
  const normalizedType = type?.toLowerCase() || 'unknown';
  const normalizedAttribute = attribute?.toLowerCase() || 'neutral';
  
  // Generate the image path based on type and attribute
  const imagePath = `/assets/type-attribute/${normalizedType}_${normalizedAttribute}.png`;
  
  // Size classes for the icon itself
  const iconSizeClasses = {
    xs: 20,
    sm: 24,
    md: 64,
    lg: 128
  };
  
  // Size classes for the background circle
  const backgroundSizeClasses = {
    xs: 20,
    sm: 24,
    md: 64,
    lg: 128
  };
  
  return (
    <View
      className={`flex items-center ${className} relative group cursor-help`}
    >
      {/* Background Circle */}
      <View className={`relative flex items-center justify-center ${backgroundSizeClasses[size]}`}>
        <View className={`absolute inset-0 bg-black opacity-20 rounded-full`}></View>
        {/* Icon Image */}
        <PixelatedImage
          source={imagePath}
          style={{ width: iconSizeClasses[size], height: iconSizeClasses[size] }}
        />
      </View>
      
      {showLabel && (
        <ThemedText className="ml-1 text-xs">
          {type}/{attribute}
        </ThemedText>
      )}
    </View>
  );
};

export default TypeAttributeIcon; 