import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { IconSymbol } from './IconSymbol';
import { ThemedText } from '../ThemedText';

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color: string;
  backgroundColor?: string;
  icon?: string;
  iconColor?: string;
  iconSize?: number;
  textContent?: string;
  textColor?: string;
  textSize?: number;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth,
  progress,
  color,
  backgroundColor = 'rgba(0, 0, 0, 0.1)',
  icon,
  iconColor,
  iconSize = 16,
  textContent,
  textColor = '#000',
  textSize = 14
}) => {
  // Calculate radius and circumference
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress * circumference);
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress Circle */}
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      
      {/* Center Content */}
      <View style={styles.contentContainer}>
        {icon && (
          <IconSymbol 
            name={icon as any} 
            size={iconSize} 
            color={iconColor || color} 
          />
        )}
        
        {textContent && (
          <ThemedText style={[styles.text, { fontSize: textSize, color: textColor }]}>
            {textContent}
          </ThemedText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: 'bold',
  }
}); 