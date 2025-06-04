import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, Divider, LinearProgress } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useDigimonStore, UserDigimon, EvolutionOption } from '@/stores/petStore';
import { useAuthStore } from '@/stores/authStore';
import DigimonSprite from '@/components/DigimonSprite';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { StatType } from '@/stores/petStore';
import { StatCategory } from '@/utils/categoryDetection';
import { calculateFinalStats } from '@/utils/digimonStatCalculation';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';
import { SimpleProgressBar } from '@/components/ui/SimpleProgressBar';
import { Colors } from '@/constants/Colors';
import TypeAttributeIcon from '@/components/TypeAttributeIcon';
import { DigimonAttribute } from '@/stores/battleStore';
import { DigimonType } from '@/stores/battleStore';

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
    devolveDigimon,
    discoveredDigimon
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
          position: 'top'
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
        position: 'top'
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
        position: 'top'
      });
      
    } catch (error) {
      console.error(`Error increasing ${statType}:`, error);
      Toast.show({
        type: 'error',
        text1: 'Error increasing stat',
        text2: 'Please try again',
        position: 'top'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Check if the digimon can evolve
  const canEvolve = (targetDigimon: UserDigimon, evolutionOption: EvolutionOption) => {
    if (targetDigimon.current_level < evolutionOption.level_required) {
      return false;
    }
    const stats = calculateFinalStats(targetDigimon);
    if (stats.hp <= (evolutionOption.stat_requirements?.hp || 0)) {
      return false;
    }
    if (stats.sp <= (evolutionOption.stat_requirements?.sp || 0)) {
      return false;
    }
    if (stats.atk <= (evolutionOption.stat_requirements?.atk || 0)) {
      return false;
    }
    if (stats.def <= (evolutionOption.stat_requirements?.def || 0)) {
      return false;
    }
    if (stats.int <= (evolutionOption.stat_requirements?.int || 0)) {
      return false;
    }
    if (stats.spd <= (evolutionOption.stat_requirements?.spd || 0)) {
      return false;
    }
    if (targetDigimon.abi <= (evolutionOption.stat_requirements?.abi || 0)) {
      return false;
    }
    return true;
  };
  
  // Handle evolution
  const handleEvolve = async (userDigimon: UserDigimon, evolution: EvolutionOption) => {
    if (!userDigimon || !canEvolve) return;

    if (!canEvolve(userDigimon, evolution)) {
      Toast.show({
        type: 'error',
        text1: 'Not enough stats to evolve',
        position: 'top'
      });
      return;
    }


    await evolveDigimon(evolution.digimon_id, userDigimon.id);
  };
  
  // Handle devolution
  const handleDevolve = async (userDigimon: UserDigimon, devolution: EvolutionOption) => {
    if (!userDigimon) return;
    
    if (!(discoveredDigimon.includes(devolution.digimon_id))) {
      Toast.show({
        type: 'error',
        text1: 'Not enough stats to evolve',
        position: 'top'
      });
      return;
    }

    setShowDevolutionModal(false);
    await devolveDigimon(devolution.digimon_id, userDigimon.id);
  };
  
  const [evolutionOptions, setEvolutionOptions] = useState<EvolutionOption[]>([]);
  const [devolutionOptions, setDevolutionOptions] = useState<EvolutionOption[]>([]);
  const [selectedEvolution, setSelectedEvolution] = useState<EvolutionOption | null>(null);
  const [selectedDevolution, setSelectedDevolution] = useState<EvolutionOption | null>(null);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [showDevolutionModal, setShowDevolutionModal] = useState(false);
  
  // Fetch evolution options when component mounts or when digimon changes
  useEffect(() => {
    if (targetDigimon) {
      const fetchOptions = async () => {
        const options = await useDigimonStore.getState().fetchEvolutionOptions(targetDigimon.digimon_id);
        setEvolutionOptions(options);
        const devolutionOptions = await useDigimonStore.getState().fetchDevolutionOptions(targetDigimon.digimon_id);
        setDevolutionOptions(devolutionOptions);
      };
      fetchOptions();
    }
  }, [targetDigimon]);
  
  // Function to handle selecting an evolution
  const handleSelectEvolution = (evolution: EvolutionOption) => {
    setSelectedEvolution(evolution);
    setShowEvolutionModal(true);
  };

  const handleSelectDevolution = (devolution: EvolutionOption) => {
    setSelectedDevolution(devolution);
    setShowDevolutionModal(true);
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
        <View style={{width: '40%', justifyContent: 'center', alignItems: 'center'}}>
        <DigimonSprite 
          digimonName={targetDigimon.digimon?.name || "Agumon"}
          fallbackSpriteUrl={targetDigimon.digimon?.sprite_url || ""}
          happiness={targetDigimon.happiness}
          size="md"
        />
        </View>
        
        <View style={styles.nameContainer}>
          <ThemedText style={styles.nickname}>{targetDigimon.name || targetDigimon.digimon?.name}</ThemedText>
          
          <View style={styles.levelContainer}>
            <ThemedText style={styles.levelText}>Lv. {targetDigimon.current_level}</ThemedText>
            <View style={styles.xpContainer}>

              
              <SimpleProgressBar
                progress={xpInfo.percentage}
                color="#3D7BF4"
              />
              <ThemedText style={styles.xpText}>
                {Math.floor(xpInfo.current)}/{xpInfo.total} XP
              </ThemedText>
              <View>
                <ThemedText style={styles.species}>#{targetDigimon.digimon?.id} {targetDigimon.digimon?.name} is a {<TypeAttributeIcon type={targetDigimon.digimon?.type as DigimonType} attribute={targetDigimon.digimon?.attribute as DigimonAttribute} size="xs" />} {targetDigimon.digimon?.type} {targetDigimon.digimon?.attribute} {targetDigimon.digimon?.stage} Digimon.</ThemedText>
              </View>

              {/* Personality */}
              {targetDigimon.personality && (
                <View style={styles.personalityContainer}>
                  <ThemedText style={styles.personalityLabel}>Personality:</ThemedText>
                  <ThemedText style={styles.personalityValue}>{targetDigimon.personality}</ThemedText>
                </View>
              )}

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
          
          </View>
        ) : (
          <View style={styles.evolutionContainer}>
            <ThemedText style={styles.evolutionTitle}>
              Digivolution
            </ThemedText>
            
            <View style={styles.evolutionOptionsContainer}>
              {evolutionOptions.map((evolution) => (
                <TouchableOpacity 
                  key={evolution.digimon_id}
                  style={styles.evolutionOption}
                  onPress={() => handleSelectEvolution(evolution)}
                >
                  <View style={styles.evolutionCard}>
                    <View style={styles.spriteContainer}>
                      <DigimonSprite 
                        digimonName={evolution.name}
                        fallbackSpriteUrl={evolution.sprite_url}
                        size="sm"
                        silhouette={!discoveredDigimon.includes(evolution.digimon_id)}
                        showHappinessAnimations={false}
                      />
                    </View>
                    {/* <ThemedText style={styles.evolutionName}>
                      {!discoveredDigimon.includes(evolution.digimon_id) ? '???' : evolution.name}
                    </ThemedText> */}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            {evolutionOptions.length > 0 ? (
              <ThemedText style={styles.evolutionInfo}>
                Tap a Digimon to view evolution details
              </ThemedText>
            ) : (
              <ThemedText style={styles.evolutionInfo}>
                No evolutions available for this Digimon
              </ThemedText>
            )}


            <ThemedText style={styles.evolutionTitle}>
              De-Digivolution
            </ThemedText>
            
            <View style={styles.evolutionOptionsContainer}>
              {devolutionOptions.map((evolution) => (
                <TouchableOpacity 
                  key={evolution.digimon_id}
                  style={styles.evolutionOption}
                  onPress={() => handleSelectDevolution(evolution)}
                >
                  <View style={styles.evolutionCard}>
                    <View style={styles.spriteContainer}>
                      <DigimonSprite 
                        digimonName={evolution.name}
                        fallbackSpriteUrl={evolution.sprite_url}
                        size="sm"
                        silhouette={!discoveredDigimon.includes(evolution.digimon_id)}
                        showHappinessAnimations={false}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            {devolutionOptions.length > 0 ? (
              <ThemedText style={styles.evolutionInfo}>
                Tap a Digimon to view evolution details
              </ThemedText>
            ) : (
              <ThemedText style={styles.evolutionInfo}>
                No de-evolutions available for this Digimon
              </ThemedText>
            )}
          </View>
          
        )}
      </ScrollView>
      
      {/* Evolution Details Modal */}
      <Modal
        visible={showEvolutionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEvolutionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Evolution</ThemedText>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowEvolutionModal(false)}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            {selectedEvolution && (
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.evolutionDetailsContainer}>
                  <View style={styles.evolutionCompareContainer}>
                    {/* Current Digimon */}
                    <View style={styles.evolutionDigimonCard}>
                      <DigimonSprite 
                        digimonName={targetDigimon.digimon?.name || "Unknown"}
                        fallbackSpriteUrl={targetDigimon.digimon?.sprite_url || ""}
                        size="sm"
                        showHappinessAnimations={false}
                      />
                      <ThemedText style={styles.currentDigimonName}>
                        {targetDigimon.digimon?.name}
                      </ThemedText>
                      <ThemedText style={styles.levelIndicator}>
                        Lv. {targetDigimon.current_level}
                      </ThemedText>
                    </View>
                    
                    {/* Evolution Arrow */}
                    <View style={styles.evolutionArrow}>
                      <IconSymbol name="arrow.right" size={28} color="#3D7BF4" />
                      <ThemedText style={styles.levelIndicator}>
                        +{ 1 + Math.floor(targetDigimon.current_level / 10)} ABI
                      </ThemedText>
                    </View>
                    
                    {/* Evolution Digimon */}
                    <View style={styles.evolutionDigimonCard}>
                      <DigimonSprite 
                        digimonName={selectedEvolution.name}
                        fallbackSpriteUrl={selectedEvolution.sprite_url}
                        size="sm"
                        silhouette={!discoveredDigimon.includes(selectedEvolution.digimon_id)}
                        showHappinessAnimations={false}
                      />
                      <ThemedText style={styles.currentDigimonName}>
                        {!discoveredDigimon.includes(selectedEvolution.digimon_id) 
                          ? '???' 
                          : selectedEvolution.name}
                      </ThemedText>
                      <ThemedText style={styles.levelIndicator}>
                        Lv. 1
                      </ThemedText>
                      
                    </View>
                  </View>
                  
                  {/* Requirements Section */}
                  <View style={styles.requirementsSection}>
                    <ThemedText style={styles.sectionTitle}>Evolution Requirements</ThemedText>
                    
                    <View style={styles.requirementCard}>
                      <View style={styles.requirementRow}>
                        <ThemedText style={styles.requirementLabel}>Level</ThemedText>
                        <View style={styles.requirementValueContainer}>
                          <ThemedText style={styles.requirementValue}>
                            {targetDigimon.current_level}
                          </ThemedText>
                          <ThemedText style={styles.requirementSeparator}>/</ThemedText>
                          <ThemedText style={
                            targetDigimon.current_level >= selectedEvolution.level_required 
                            ? styles.requirementMet 
                            : styles.requirementNotMet
                          }>
                            {selectedEvolution.level_required}
                          </ThemedText>
                        </View>
                        <View style={[
                          styles.requirementStatus,
                          targetDigimon.current_level >= selectedEvolution.level_required 
                            ? styles.requirementMetBadge 
                            : styles.requirementNotMetBadge
                        ]}>
                          <ThemedText style={styles.requirementStatusText}>
                            {targetDigimon.current_level >= selectedEvolution.level_required ? "OK" : "NO"}
                          </ThemedText>
                        </View>
                      </View>
                      
                      {selectedEvolution.stat_requirements && 
                       Object.entries(selectedEvolution.stat_requirements).map(([stat, value]) => {
                        const currentStat = finalStats[stat.toLowerCase() as keyof typeof finalStats] || 0;
                        const isMet = currentStat >= value;
                        
                        return (
                          <View key={stat} style={styles.requirementRow}>
                            <ThemedText style={styles.requirementLabel}>{stat.toUpperCase()}</ThemedText>
                            <View style={styles.requirementValueContainer}>
                              <ThemedText style={styles.requirementValue}>
                                {currentStat}
                              </ThemedText>
                              <ThemedText style={styles.requirementSeparator}>/</ThemedText>
                              <ThemedText style={
                                isMet ? styles.requirementMet : styles.requirementNotMet
                              }>
                                {value}
                              </ThemedText>
                            </View>
                            <View style={[
                              styles.requirementStatus,
                              isMet ? styles.requirementMetBadge : styles.requirementNotMetBadge
                            ]}>
                              <ThemedText style={styles.requirementStatusText}>
                                {isMet ? "OK" : "NO"}
                              </ThemedText>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  
                  {/* Evolution Button */}
                  <Button
                    title="Digivolve"
                    onPress={() => handleEvolve(targetDigimon, selectedEvolution)}
                    buttonStyle={styles.evolveButton}
                    titleStyle={styles.evolveButtonText}
                    disabled={!canEvolve(targetDigimon, selectedEvolution)}
                    disabledStyle={styles.disabledEvolveButton}
                    disabledTitleStyle={styles.disabledEvolveButtonText}
                  />
                </View>
              </ScrollView>
            )}
          </ThemedView>
        </View>
      </Modal>

      {/* Devolution Details Modal */}
      <Modal
        visible={showDevolutionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDevolutionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Devolution</ThemedText>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDevolutionModal(false)}
              >
                <IconSymbol name="xmark.circle.fill" size={24} color="#999" />
              </TouchableOpacity>
            </View>
            
            {selectedDevolution && (
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.evolutionDetailsContainer}>
                  <View style={styles.evolutionCompareContainer}>
                    {/* Current Digimon */}
                    <View style={styles.evolutionDigimonCard}>
                      <DigimonSprite 
                        digimonName={targetDigimon.digimon?.name || "Unknown"}
                        fallbackSpriteUrl={targetDigimon.digimon?.sprite_url || ""}
                        size="sm"
                        showHappinessAnimations={false}
                      />
                      <ThemedText style={styles.currentDigimonName}>
                        {targetDigimon.digimon?.name}
                      </ThemedText>
                      <ThemedText style={styles.levelIndicator}>
                        Lv. {targetDigimon.current_level}
                      </ThemedText>
                    </View>
                    
                    {/* Devolution Arrow */}
                    <View style={styles.evolutionArrow}>
                      <IconSymbol name="arrow.right" size={28} color="#3D7BF4" />
                      <ThemedText style={styles.levelIndicator}>
                        +{ 1 + Math.floor(targetDigimon.current_level / 5)} ABI
                      </ThemedText>
                    </View>
                    
                    {/* Evolution Digimon */}
                    <View style={styles.evolutionDigimonCard}>
                      <DigimonSprite 
                        digimonName={selectedDevolution.name}
                        fallbackSpriteUrl={selectedDevolution.sprite_url}
                        size="sm"
                        silhouette={!discoveredDigimon.includes(selectedDevolution.digimon_id)}
                        showHappinessAnimations={false}
                      />
                      <ThemedText style={styles.currentDigimonName}>
                        {!discoveredDigimon.includes(selectedDevolution.digimon_id) 
                          ? '???' 
                          : selectedDevolution.name}
                      </ThemedText>
                      <ThemedText style={styles.levelIndicator}>
                        Lv. 1
                      </ThemedText>
                    </View>
                  </View>
                  
                  {/* Evolution Button */}
                  <Button
                    title="De-Digivolve"
                    onPress={() => handleDevolve(targetDigimon, selectedDevolution)}
                    buttonStyle={styles.evolveButton}
                    titleStyle={styles.evolveButtonText}
                    disabled={!discoveredDigimon.includes(selectedDevolution.digimon_id)}
                    disabledStyle={styles.disabledEvolveButton}
                    disabledTitleStyle={styles.disabledEvolveButtonText}
                  />
                </View>
              </ScrollView>
            )}
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 8,
  },
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  species: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 4,
    textAlign: 'center',
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
    paddingVertical: 4,
    justifyContent: 'center',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  evolveButton: {
    backgroundColor: '#3D7BF4',
    paddingHorizontal: 32,
    borderRadius: 12,
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
  evolutionOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginVertical: 8,
    width: '100%',
  },
  evolutionOption: {
    width: '30%',
    marginBottom: 16,
  },
  evolutionCard: {
    borderWidth: 0,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  spriteContainer: {
    marginBottom: 8,
  },
  evolutionName: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  evolutionInfo: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  evolutionDetailsContainer: {
    padding: 16,
  },
  evolutionCompareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  evolutionDigimonCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    width: '40%',
  },
  currentDigimonName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  evolutionDigimonName: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    color: '#3D7BF4',
  },
  evolutionArrow: {
    width: '15%',
    alignItems: 'center',
  },
  levelIndicator: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  requirementsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  requirementCard: {
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    padding: 16,
    borderWidth: 0,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  requirementLabel: {
    fontSize: 16,
    fontWeight: '500',
    width: '25%',
  },
  requirementValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '35%',
  },
  requirementValue: {
    fontSize: 16,
  },
  requirementSeparator: {
    fontSize: 16,
    marginHorizontal: 4,
  },
  requirementMet: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  requirementNotMet: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  requirementStatus: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: '30%',
    alignItems: 'center',
  },
  requirementMetBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  requirementNotMetBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  requirementStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  evolveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledEvolveButton: {
    backgroundColor: 'rgba(61, 123, 244, 0.3)',
  },
  disabledEvolveButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
}); 