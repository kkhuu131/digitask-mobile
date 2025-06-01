import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';
import { SimpleProgressBar } from './ui/SimpleProgressBar';

interface DailyQuotaDisplayProps {
  completedToday: number;
  quota: number;
  streak: number;
  multiplier: number;
}

export const DailyQuotaDisplay: React.FC<DailyQuotaDisplayProps> = ({
  completedToday,
  quota,
  streak,
  multiplier
}) => {
  // Calculate progress as a percentage between 0-1
  const progress = Math.min(1, Math.round((completedToday / quota) * 100) / 100);
  
  // Determine if quota is complete
  const isComplete = completedToday >= quota;
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.row}>
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Daily Quota</ThemedText>
          <ThemedText style={styles.subtitle}>
            {isComplete ? 'Completed' : `${completedToday}/${quota} tasks`}
          </ThemedText>
        </View>
        
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <IconSymbol name="flame.fill" size={16} color="#FF9500" />
            <ThemedText style={styles.statValue}>{streak}</ThemedText>
            <ThemedText style={styles.statLabel}>streak</ThemedText>
          </View>
          
          <View style={styles.statItem}>
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={16} color="#30B0C7" />
            <ThemedText style={styles.statValue}>{multiplier}x</ThemedText>
            <ThemedText style={styles.statLabel}>bonus</ThemedText>
          </View>
        </View>
      </View>
      
      <SimpleProgressBar 
        progress={progress}
        color={isComplete ? '#4CAF50' : '#3D7BF4'}
        style={styles.progressBar}
        height={10}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {},
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  statsSection: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statValue: {
    fontWeight: 'bold',
    marginLeft: 4,
    marginRight: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  progressBar: {
    width: '100%',
    borderRadius: 5,
  }
}); 