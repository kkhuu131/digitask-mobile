import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Divider, LinearProgress } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useDigimonStore, UserDigimon } from '@/stores/petStore';
import { useAuthStore } from '@/stores/authStore';
import DigimonSprite from '@/components/DigimonSprite';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StatType } from '@/stores/petStore';
import { StatCategory } from '@/utils/categoryDetection';
import { calculateFinalStats } from '@/utils/digimonStatCalculation';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';

// Function to calculate remaining stat points based on level
const getRemainingStatPoints = (digimon: UserDigimon) => {
  if (!digimon) return 0;
  
  // Calculate total bonus stats already allocated
  const totalBonusStats = 
    (digimon.hp_bonus || 0) + 
    (digimon.sp_bonus || 0) + 
    (digimon.atk_bonus || 0) + 
    (digimon.def_bonus || 0) + 
    (digimon.int_bonus || 0) + 
    (digimon.spd_bonus || 0);
  
  const totalAvailable = Math.floor(digimon.abi / 2) + 50;
  
  return Math.max(0, totalAvailable - totalBonusStats);
};

// Type for user's saved stats
interface SavedStats {
  HP: number;
  SP: number;
  ATK: number;
  DEF: number;
  INT: number;
  SPD: number;
  [key: string]: number; // Index signature for dynamic access
}

// Component for displaying a stat row with label, value, and bonus
const StatRow = ({ 
  label, 
  value, 
  bonusValue, 
  onIncrease, 
  canIncrease,
  availableSavedStat = 0
}: { 
  label: string; 
  value: number; 
  bonusValue?: number; 
  onIncrease: () => void; 
  canIncrease: boolean;
  availableSavedStat?: number;
}) => {
  return (
    <View style={styles.statRow}>
      <View style={styles.statLabelContainer}>
        <ThemedText style={styles.statLabel}>{label}</ThemedText>
      </View>
      <View style={styles.statValueContainer}>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
        {bonusValue ? (
          <ThemedText style={styles.bonusValue}>(+{bonusValue})</ThemedText>
        ) : null}
      </View>
      <View style={styles.statActions}>
        {availableSavedStat > 0 && (
          <ThemedText style={styles.savedStatCount}>{availableSavedStat}</ThemedText>
        )}
        <TouchableOpacity 
          style={[
            styles.increaseButton, 
            (!canIncrease || availableSavedStat <= 0) && styles.disabledButton
          ]} 
          onPress={onIncrease}
          disabled={!canIncrease || availableSavedStat <= 0}
        >
          <IconSymbol name="plus" size={16} color={(!canIncrease || availableSavedStat <= 0) ? "#999" : "#3D7BF4"} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function DigimonDetailsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { digimonId } = useLocalSearchParams<{ digimonId: string }>();
  const { user } = useAuthStore();
  
  const { 
    userDigimon,
    allUserDigimon,
    increaseStat,
    checkEvolution,
    evolveDigimon,
    devolveDigimon
  } = useDigimonStore();
  
  // State for saved stats
  const [savedStats, setSavedStats] = useState<SavedStats>({
    HP: 0, SP: 0, ATK: 0, DEF: 0, INT: 0, SPD: 0
  });
  const [loading, setLoading] = useState(false);
  
  // Find the specific Digimon if an ID was provided
  const targetDigimon = useMemo(() => {
    if (digimonId) {
      return allUserDigimon.find(d => d.id === digimonId) || userDigimon;
    }
    return userDigimon;
  }, [digimonId, allUserDigimon, userDigimon]);
  
  // Fetch user's saved stats
  useEffect(() => {
    const fetchSavedStats = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('saved_stats')
          .eq('id', user.id)
          .single();

        console.log('data', data);
          
        if (error) throw error;
        
        if (data && data.saved_stats) {
          setSavedStats(data.saved_stats);
        }
      } catch (error) {
        console.error('Error fetching saved stats:', error);
        Toast.show({
          type: 'error',
          text1: 'Could not load your saved stats',
          position: 'bottom'
        });
      }
    };
    
    fetchSavedStats();
  }, [user]);
  
  // State for navigation tab
  const [activeTab, setActiveTab] = useState<'stats' | 'evolution'>('stats');
  
  // Navigate back
  const handleBack = () => {
    router.back();
  };
  
  // Calculate available stat points
  const availablePoints = getRemainingStatPoints(targetDigimon as UserDigimon);
  
  // Calculate XP required for next level
  const calculateXpToNextLevel = () => {
    if (!targetDigimon) return { current: 0, total: 100, percentage: 0 };
    
    const currentLevel = targetDigimon.current_level;
    const baseXpForLevel = currentLevel * 20;
    const currentLevelXp = targetDigimon.experience_points % baseXpForLevel;
    
    return {
      current: currentLevelXp,
      total: baseXpForLevel,
      percentage: currentLevelXp / baseXpForLevel
    };
  };
  
  const xpInfo = calculateXpToNextLevel();
  
  // Calculate final stats using the digimonStatCalculation utility
  const finalStats = useMemo(() => {
    if (!targetDigimon) return { hp: 0, sp: 0, atk: 0, def: 0, int: 0, spd: 0 };
    return calculateFinalStats(targetDigimon);
  }, [targetDigimon]);
  
  // Handle increasing a stat
  const handleIncreaseStat = async (statType: StatType) => {
    if (!targetDigimon || availablePoints <= 0 || !user) return;
    
    // Use uppercase for the statKey to match the saved_stats structure
    const statKey = statType.toUpperCase();
    
    // Check if user has this saved stat available
    if (savedStats[statKey] <= 0) {
      Toast.show({
        type: 'error',
        text1: `No ${statType} points available`,
        text2: 'Complete tasks to earn more stat points',
        position: 'bottom'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Get the lowercase version of the stat for the database field
      const lowerStatType = statType.toLowerCase();
      const bonusField = `${lowerStatType}_bonus` as keyof UserDigimon;
      
      // 1. Directly update the Digimon's stat in the database
      const currentBonus = targetDigimon[bonusField] || 0;
      const newBonus = Number(currentBonus) + 1;
      
      const { error: digimonUpdateError } = await supabase
        .from("user_digimon")
        .update({
          [bonusField]: newBonus,
        })
        .eq("id", targetDigimon.id);
        
      if (digimonUpdateError) throw digimonUpdateError;
      
      // 2. Update the local Digimon state
      const updatedDigimon = {
        ...targetDigimon,
        [bonusField]: newBonus
      };
      
      // 3. Decrement the user's saved stat
      const updatedSavedStats = {
        ...savedStats,
        [statKey]: savedStats[statKey] - 1
      };
      
      // 4. Update the saved stats in the database
      const { error } = await supabase
        .from('profiles')
        .update({ saved_stats: updatedSavedStats })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // 5. Update local states
      setSavedStats(updatedSavedStats);
      
      // Handle allUserDigimon update
      if (digimonId) {
        // This is for a specific Digimon from the list
        useDigimonStore.setState(state => ({
          allUserDigimon: state.allUserDigimon.map(d => 
            d.id === targetDigimon.id ? updatedDigimon : d
          )
        }));
        
        // If this is also the active Digimon, update that too
        if (userDigimon?.id === targetDigimon.id) {
          useDigimonStore.setState({ userDigimon: updatedDigimon });
        }
      } else {
        // This is the active Digimon
        useDigimonStore.setState({ userDigimon: updatedDigimon });
      }
      
      Toast.show({
        type: 'success',
        text1: `${statType} increased`,
        position: 'bottom'
      });
      
    } catch (error) {
      console.error(`Error increasing ${statType}:`, error);
      Toast.show({
        type: 'error',
        text1: 'Error increasing stat',
        text2: 'Please try again',
        position: 'bottom'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Check if the digimon can evolve
  const canEvolve = useMemo(() => {
    if (!targetDigimon) return false;
    return checkEvolution(targetDigimon);
  }, [targetDigimon, checkEvolution]);
  
  // Handle evolution
  const handleEvolve = async () => {
    if (!targetDigimon || !canEvolve) return;
    
    // await evolveDigimon(targetDigimon.id);
  };
  
  // Handle devolution
  const handleDevolve = async () => {
    if (!targetDigimon) return;
    
    // await devolveDigimon(targetDigimon.id);
  };
  
  if (!targetDigimon) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.noDigimonText}>No active Digimon found</ThemedText>
        <Button 
          title="Go Back" 
          onPress={handleBack}
          buttonStyle={styles.backButton}
        />
      </ThemedView>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      {/* Header with back button */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButtonContainer}>
          <IconSymbol name="chevron.left" size={24} />
          <ThemedText>Back</ThemedText>
        </TouchableOpacity>
      </View> */}
      
      {/* Digimon profile section */}
      <View style={styles.profileSection}>
        <DigimonSprite 
          digimonName={targetDigimon.digimon?.name || "Agumon"}
          fallbackSpriteUrl={targetDigimon.digimon?.sprite_url || ""}
          happiness={targetDigimon.happiness}
          size="md"
          enableHopping={targetDigimon.happiness > 80}
        />
        
        <View style={styles.nameContainer}>
          <ThemedText style={styles.nickname}>{targetDigimon.name}</ThemedText>
          <ThemedText style={styles.species}>{targetDigimon.digimon?.name}</ThemedText>
          
          <View style={styles.levelContainer}>
            <ThemedText style={styles.levelText}>Level {targetDigimon.current_level}</ThemedText>
            <View style={styles.xpContainer}>
              {/* <LinearProgress 
                style={styles.xpBar} 
                value={xpInfo.percentage} 
                color="#3D7BF4"
                trackColor={Colors[colorScheme ?? 'light'].background}
                variant="determinate"
              /> */}
              <ThemedText style={styles.xpText}>
                {Math.floor(xpInfo.current)}/{xpInfo.total} XP
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
      
      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]} 
          onPress={() => setActiveTab('stats')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Stats
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'evolution' && styles.activeTab]} 
          onPress={() => setActiveTab('evolution')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'evolution' && styles.activeTabText]}>
            Evolution
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      <Divider width={1} />
      
      <ScrollView style={styles.contentContainer}>
        {activeTab === 'stats' ? (
          <View style={styles.statsContainer}>
            {/* Available stat points */}
            {availablePoints > 0 && (
              <View style={styles.availablePointsContainer}>
                <ThemedText style={styles.availablePointsText}>
                  Bonus points until stat caps: {availablePoints}
                </ThemedText>
              </View>
            )}
            
            {/* Stats */}
            <StatRow 
              label="HP" 
              value={finalStats.hp} 
              bonusValue={targetDigimon.hp_bonus} 
              onIncrease={() => handleIncreaseStat('HP')} 
              canIncrease={availablePoints > 0}
              availableSavedStat={savedStats.HP}
            />
            
            <StatRow 
              label="SP" 
              value={finalStats.sp} 
              bonusValue={targetDigimon.sp_bonus} 
              onIncrease={() => handleIncreaseStat('SP')} 
              canIncrease={availablePoints > 0}
              availableSavedStat={savedStats.SP}
            />
            
            <StatRow 
              label="ATK" 
              value={finalStats.atk} 
              bonusValue={targetDigimon.atk_bonus} 
              onIncrease={() => handleIncreaseStat('ATK')} 
              canIncrease={availablePoints > 0}
              availableSavedStat={savedStats.ATK}
            />
            
            <StatRow 
              label="DEF" 
              value={finalStats.def} 
              bonusValue={targetDigimon.def_bonus} 
              onIncrease={() => handleIncreaseStat('DEF')} 
              canIncrease={availablePoints > 0}
              availableSavedStat={savedStats.DEF}
            />
            
            <StatRow 
              label="INT" 
              value={finalStats.int} 
              bonusValue={targetDigimon.int_bonus} 
              onIncrease={() => handleIncreaseStat('INT')} 
              canIncrease={availablePoints > 0}
              availableSavedStat={savedStats.INT}
            />
            
            <StatRow 
              label="SPD" 
              value={finalStats.spd} 
              bonusValue={targetDigimon.spd_bonus} 
              onIncrease={() => handleIncreaseStat('SPD')} 
              canIncrease={availablePoints > 0}
              availableSavedStat={savedStats.SPD}
            />

            <StatRow 
              label="ABI" 
              value={targetDigimon.abi} 
              bonusValue={0}
              onIncrease={() => {}}
              canIncrease={false}
            />
            
            {/* Personality */}
            {targetDigimon.personality && (
              <View style={styles.personalityContainer}>
                <ThemedText style={styles.personalityLabel}>Personality:</ThemedText>
                <ThemedText style={styles.personalityValue}>{targetDigimon.personality}</ThemedText>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.evolutionContainer}>
            <ThemedText style={styles.evolutionTitle}>
              {canEvolve ? 'Your Digimon can evolve!' : 'Your Digimon is not ready to evolve yet.'}
            </ThemedText>
            
            {canEvolve && (
              <Button
                title="Evolve"
                onPress={handleEvolve}
                buttonStyle={styles.evolveButton}
              />
            )}
            
            <Divider style={styles.divider} />
            
            <Button
              title="Devolve"
              type="outline"
              onPress={handleDevolve}
              buttonStyle={styles.devolveButton}
            />
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  nameContainer: {
    flex: 1,
    marginLeft: 16,
  },
  nickname: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  species: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 8,
  },
  levelContainer: {
    marginTop: 4,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  xpContainer: {
    marginTop: 4,
  },
  xpBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  xpText: {
    fontSize: 12,
    opacity: 0.7,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3D7BF4',
  },
  tabText: {
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#3D7BF4',
  },
  contentContainer: {
    flex: 1,
    marginTop: 16,
  },
  statsContainer: {
    paddingHorizontal: 16,
  },
  availablePointsContainer: {
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(61, 123, 244, 0.1)',
  },
  availablePointsText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statLabelContainer: {
    width: 60,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
  },
  bonusValue: {
    fontSize: 14,
    color: '#3D7BF4',
    marginLeft: 8,
  },
  statActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedStatCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    color: '#3D7BF4',
  },
  increaseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(61, 123, 244, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  personalityContainer: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 8,
  },
  personalityLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  personalityValue: {
    fontSize: 16,
  },
  evolutionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  evolutionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 24,
    textAlign: 'center',
  },
  evolveButton: {
    backgroundColor: '#3D7BF4',
    paddingHorizontal: 32,
  },
  divider: {
    width: '100%',
    marginVertical: 24,
  },
  devolveButton: {
    borderColor: '#3D7BF4',
  },
  noDigimonText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3D7BF4',
  },
}); 