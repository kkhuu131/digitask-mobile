import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearProgress } from '@rneui/themed';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import DigimonSprite from './DigimonSprite';
import { UserDigimon } from '@/stores/petStore';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SimpleProgressBar } from './ui/SimpleProgressBar';
import PixelatedImage from './PixelatedImage';

interface DigimonDisplayProps {
  userDigimon: UserDigimon | null;
  onPress?: () => void;
}

export const DigimonDisplay: React.FC<DigimonDisplayProps> = ({ 
  userDigimon,
  onPress
}) => {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  
  // Calculate the level progress (current XP % to next level)
  const calculateLevelProgress = () => {
    if (!userDigimon) return 0;
    
    const currentLevel = userDigimon.current_level;
    const baseXpForNextLevel = currentLevel * 20;
    
    // Ensure we're working with integer math as much as possible
    const currentLevelXp = Math.floor(userDigimon.experience_points % baseXpForNextLevel);
    
    // Calculate progress
    const progress = Math.round((currentLevelXp / baseXpForNextLevel) * 100) / 100;
    
    return Math.min(Math.max(0, progress), 1);
  };
  
  // Calculate happiness as a percentage rounded to 2 decimal places
  const happinessPercentage = userDigimon ? Math.round((userDigimon.happiness / 100) * 100) / 100 : 0;
  
  // Get color for happiness bar
  const getHappinessColor = () => {
    if (happinessPercentage > 0.7) return '#4CAF50'; // Green
    if (happinessPercentage > 0.4) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };
  
  // Handle navigation to details page
  const handleDetailsPress = () => {
    if (onPress) {
      onPress();
    } else {
      // @ts-ignore - This is a navigation route
      navigation.navigate('DigimonDetails');
    }
  };
  
  if (!userDigimon) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.emptyText}>No active Digimon</ThemedText>
      </ThemedView>
    );
  }
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.7}
      onPress={handleDetailsPress}
    >
      <ThemedView style={styles.card}>
        {/* Digimon sprite and basic info */}
        <View style={styles.digimonHeader}>
          <DigimonSprite 
            digimonName={userDigimon.digimon?.name || "Agumon"}
            fallbackSpriteUrl={userDigimon.digimon?.sprite_url || ""}
            happiness={userDigimon.happiness || 100}
            size="md"
          />
          
          <View style={styles.infoContainer}>
            <ThemedText style={styles.nickname}>{userDigimon.name}</ThemedText>
            <ThemedText style={styles.species}>{userDigimon.digimon?.name}</ThemedText>
            
            <View style={styles.statsRow}>
              <IconSymbol 
                name="heart.fill" 
                size={16} 
                color={getHappinessColor()} 
              />
              <ThemedText style={styles.statLabel}>Happiness</ThemedText>
              <SimpleProgressBar 
                style={styles.progressBar} 
                progress={happinessPercentage} 
                color={getHappinessColor()}
              />
              <ThemedText style={styles.statValue}>{Math.round(userDigimon.happiness)}</ThemedText>
            </View>
            
            <View style={styles.statsRow}>
              <IconSymbol 
                name="flame.fill" 
                size={16} 
                color="#3D7BF4" 
              />
              <ThemedText style={styles.statLabel}>Level</ThemedText>
              <SimpleProgressBar 
                style={styles.progressBar} 
                progress={calculateLevelProgress()} 
                color="#3D7BF4"
              />
              <ThemedText style={styles.statValue}>{userDigimon.current_level}</ThemedText>
            </View>
          </View>
        </View>
        
        {/* Bottom controls and details hint */}
        <View style={styles.detailsRow}>
          <View style={styles.detailsHint}>
            <ThemedText style={styles.detailsText}>Tap for details</ThemedText>
            <IconSymbol name="chevron.right" size={16} />
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginTop: 10,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  digimonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  species: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    width: 70,
    marginLeft: 4,
  },
  statValue: {
    fontSize: 12,
    width: 25,
    textAlign: 'right',
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 12,
    opacity: 0.6,
    marginRight: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 24,
  },
}); 