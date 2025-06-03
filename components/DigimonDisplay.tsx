import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import DigimonSprite from './DigimonSprite';
import { UserDigimon } from '@/stores/petStore';
import { IconSymbol } from './ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CircularProgress } from './ui/CircularProgress';

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
        {/* Digimon info header */}
        <View style={styles.infoHeader}>
          <ThemedText style={styles.nickname}>{userDigimon.name}</ThemedText>
          <ThemedText style={styles.species}>{userDigimon.digimon?.name}</ThemedText>
        </View>
        
        {/* Digimon sprite and circular indicators */}
        <View style={styles.spriteRow}>
          {/* Happiness indicator on the left */}
          <CircularProgress
            size={60}
            strokeWidth={6}
            progress={happinessPercentage}
            color={getHappinessColor()}
            icon="heart.fill"
            iconSize={20}
            iconColor={getHappinessColor()}
          />
          
          {/* Digimon sprite in the center */}
          <View style={styles.spriteContainer}>
            <DigimonSprite 
              digimonName={userDigimon.digimon?.name || "Agumon"}
              fallbackSpriteUrl={userDigimon.digimon?.sprite_url || ""}
              happiness={userDigimon.happiness || 100}
              size="md"
            />
          </View>
          
          {/* Level indicator on the right */}
          <CircularProgress
            size={60}
            strokeWidth={6}
            progress={calculateLevelProgress()}
            color="#3D7BF4"
            textContent={`${userDigimon.current_level}`}
            textSize={18}
            textColor="#3D7BF4"
          />
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
  infoHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  species: {
    fontSize: 14,
    opacity: 0.7,
  },
  spriteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  spriteContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
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