import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface SimpleProgressBarProps {
  progress: number; // 0 to 1
  color: string;
  height?: number;
  style?: any;
}

export const SimpleProgressBar: React.FC<SimpleProgressBarProps> = ({
  progress,
  color,
  height = 8,
  style
}) => {
  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;
  
  // Ensure progress is a valid percentage between 0-100
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress * 100)));
  
  return (
    <View style={[styles.container, { height }, style, { backgroundColor }]}>
      <View 
        style={[
          styles.progress, 
          { 
            width: `${safeProgress}%`, 
            backgroundColor: color,
            height
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%'
  },
  progress: {
    borderRadius: 4
  }
}); 