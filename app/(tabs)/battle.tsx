import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useBattleStore } from '@/stores/battleStore';
import { useDigimonStore, UserDigimon } from '@/stores/petStore';
import DigimonSprite from '@/components/DigimonSprite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TypeAttributeIcon from '@/components/TypeAttributeIcon';
import { DigimonAttribute, DigimonType } from '@/stores/battleStore';
import { format } from 'date-fns';
import Toast from 'react-native-toast-message';
import TeamBattleAnimation from '@/components/TeamBattleAnimation';

export default function BattleScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { 
    battleOptions, 
    getBattleOptions, 
    selectAndStartBattle,
    currentTeamBattle,
    teamBattleHistory,
    fetchTeamBattleHistory,
    loading,
    error,
    clearCurrentTeamBattle,
    dailyBattlesRemaining,
    checkDailyBattleLimit,
    isBattleInProgress
  } = useBattleStore();

  const { 
    allUserDigimon, 
    fetchAllUserDigimon,
    setTeamMember
  } = useDigimonStore();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'battle' | 'team' | 'history'>('battle');
  const [localLoading, setLocalLoading] = useState(false);
  // Track local state for battle options and daily battles remaining
  const [localBattleOptions, setLocalBattleOptions] = useState(battleOptions);
  const [localDailyBattlesRemaining, setLocalDailyBattlesRemaining] = useState(dailyBattlesRemaining);
  // Track when a battle is completed
  const [battleJustCompleted, setBattleJustCompleted] = useState(false);
  // Keep track of last battle ID to detect new battles
  const lastBattleIdRef = useRef<string | null>(null);
  // State for battle animation
  const [showBattleAnimation, setShowBattleAnimation] = useState(false);

  // Get team digimon
  const teamDigimon = allUserDigimon.filter(d => d.is_on_team);
  // Get non-team digimon (excluding storage)
  const nonTeamDigimon = allUserDigimon.filter(d => !d.is_on_team && !d.is_in_storage);

  // Monitor battle state changes
  useEffect(() => {
    // Check if we're in a battle or just completed one
    if (isBattleInProgress) {
      // Battle is in progress, ensure loading indicator shows
      setLocalLoading(true);
    } 
    else if (currentTeamBattle && currentTeamBattle.id !== lastBattleIdRef.current) {
      // Battle just completed (new battle result available)
      lastBattleIdRef.current = currentTeamBattle.id;
      setBattleJustCompleted(true);
      
      // Update local UI state immediately
      setLocalDailyBattlesRemaining(prev => Math.max(0, prev - 1));
      
      // Show battle animation instead of toast
      setShowBattleAnimation(true);
    }
  }, [currentTeamBattle, isBattleInProgress, teamDigimon]);

  // Handle battle completion process
  useEffect(() => {
    if (battleJustCompleted && !isBattleInProgress && !showBattleAnimation) {
      const completePostBattleProcess = async () => {
        try {
          // Update all necessary data in the background
          await fetchTeamBattleHistory();
          await fetchAllUserDigimon();
          await checkDailyBattleLimit();
          await getBattleOptions(true);
          
          // Reset battle state
          clearCurrentTeamBattle();
          setSelectedOption(null);
          setBattleJustCompleted(false);
        } catch (error) {
          console.error('Error completing battle updates:', error);
        } finally {
          setLocalLoading(false);
        }
      };
      
      completePostBattleProcess();
    }
  }, [battleJustCompleted, isBattleInProgress, showBattleAnimation]);

  // Update local state when store state changes
  useEffect(() => {
    setLocalBattleOptions(battleOptions);
  }, [battleOptions]);

  useEffect(() => {
    setLocalDailyBattlesRemaining(dailyBattlesRemaining);
  }, [dailyBattlesRemaining]);

  useEffect(() => {
    const loadData = async () => {
      setLocalLoading(true);
      try {
        await fetchAllUserDigimon();
        
        // Only fetch battle options if needed
        const battleStore = useBattleStore.getState();
        if (
          battleStore.shouldRefreshOptions || 
          battleStore.battleOptions.length === 0 ||
          !battleStore.lastOptionsRefresh
        ) {
          await getBattleOptions();
        }
        
        // Also refresh the daily battle limit
        await checkDailyBattleLimit();
        
        // Fetch battle history
        await fetchTeamBattleHistory();
      } catch (error) {
        console.error('Error loading battle data:', error);
        Toast.show({
          type: 'error',
          text1: 'Error loading battle data',
          text2: 'Please try again later',
          position: 'top',
        });
      } finally {
        setLocalLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleStartBattle = async (optionId: string) => {
    // Prevent multiple clicks while loading
    if (!optionId || loading || localLoading || isBattleInProgress) return;
    
    try {
      setLocalLoading(true);
      setSelectedOption(optionId);
      
      // Remove the selected option from local UI immediately
      setLocalBattleOptions(prev => prev.filter(option => option.id !== optionId));
      
      // Start the battle
      await selectAndStartBattle(optionId);
    } catch (error) {
      console.error('Error starting battle:', error);
      Toast.show({
        type: 'error',
        text1: 'Error starting battle',
        text2: 'Please try again later',
        position: 'top',
      });
      
      // If error, restore the local battle options
      setLocalBattleOptions(battleOptions);
      setLocalLoading(false);
    }
  };

  // Handle battle animation completion
  const handleBattleAnimationComplete = () => {
    setShowBattleAnimation(false);
    setBattleJustCompleted(true);
  };

  const handleToggleTeamMember = async (digimon: UserDigimon) => {
    try {
      setLocalLoading(true);
      await setTeamMember(digimon.id, !digimon.is_on_team);
    } catch (error) {
      console.error('Error toggling team member:', error);
      Toast.show({
        type: 'error',
        text1: 'Error updating team',
        text2: 'Please try again later',
        position: 'top',
      });
    } finally {
      setLocalLoading(false);
    }
  };

  // Render a battle option card
  const renderBattleOption = ({ item }: { item: any }) => {
    return (
      <View style={[
        styles.battleOptionCard,
        isDark && styles.battleOptionCardDark,
        selectedOption === item.id && styles.selectedBattleOption
      ]}>
        <View style={styles.battleOptionHeader}>
          <View style={[
            styles.difficultyBadge,
            item.difficulty === 'easy' ? styles.easyBadge : 
            item.difficulty === 'medium' ? styles.mediumBadge : 
            styles.hardBadge
          ]}>
            <ThemedText style={styles.difficultyText}>
              {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
            </ThemedText>
          </View>
          <ThemedText style={styles.opponentName}>
            {item.isWild ? 'Wild Digimon' : item.team.display_name || item.team.username}
          </ThemedText>
        </View>
        
        <View style={styles.battleTeamContainer}>
          {item.team.digimon.map((digimon: any, index: number) => (
            <View key={index} style={styles.battleTeamMember}>
              <View style={styles.battleSpriteContainer}>
                <DigimonSprite 
                  digimonName={digimon.name}
                  fallbackSpriteUrl={digimon.sprite_url}
                  size="xs"
                  showHappinessAnimations={false}
                />
              </View>
              {digimon.type && digimon.attribute && (
                <View style={styles.typeAttributeContainer}>
                  <TypeAttributeIcon
                    type={digimon.type as DigimonType}
                    attribute={digimon.attribute as DigimonAttribute}
                    size="xs"
                  />
                </View>
              )}
              <ThemedText style={styles.battleDigimonLevel}>Lv.{digimon.current_level}</ThemedText>
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={[
            styles.battleButton,
            (loading || localLoading || localDailyBattlesRemaining <= 0 || teamDigimon.length < 1 || isBattleInProgress) && 
              styles.disabledButton
          ]}
          onPress={() => handleStartBattle(item.id)}
          disabled={loading || localLoading || localDailyBattlesRemaining <= 0 || teamDigimon.length < 1 || isBattleInProgress}
        >
          <ThemedText style={styles.battleButtonText}>
            {loading || localLoading ? "Starting..." : 
             isBattleInProgress ? "Battle in progress..." :
             localDailyBattlesRemaining <= 0 ? "No battles left" : 
             teamDigimon.length < 1 ? "Need team" : "Battle!"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  // Render a team member card
  const renderTeamMember = ({ item }: { item: UserDigimon }) => {
    return (
      <TouchableOpacity 
        style={[styles.teamMemberCard, isDark && styles.teamMemberCardDark, item.is_on_team && styles.activeTeamMember]}
        onPress={() => handleToggleTeamMember(item)}
        disabled={loading || localLoading}
      >
        <View style={styles.teamMemberSprite}>
          <DigimonSprite 
            digimonName={item.digimon?.name || "Unknown"}
            fallbackSpriteUrl={item.digimon?.sprite_url || ""}
            size="xs"
            showHappinessAnimations={false}
          />
        </View>
        <View style={styles.teamMemberInfo}>
          {/* <ThemedText style={styles.teamMemberName} numberOfLines={1}>
            {item.name || item.digimon?.name}
          </ThemedText> */}
          {/* <ThemedText style={styles.teamMemberLevel}>
            Lv. {item.current_level}
          </ThemedText> */}
        </View>
        <View style={styles.teamMemberStatus}>
          {/* {item.is_on_team ? (
            <IconSymbol name="checkmark.circle.fill" size={24} color="#4CAF50" />
          ) : (
            <IconSymbol name="plus.circle" size={24} color="#757575" />
          )} */}
          <TypeAttributeIcon type={item.digimon?.type as DigimonType} attribute={item.digimon?.attribute as DigimonAttribute} size="sm" />
          <ThemedText style={styles.teamMemberLevel}>
            Lv.{item.current_level}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a battle history item
  const renderBattleHistoryItem = ({ item }: { item: any }) => {
    const isWin = item.winner_id === item.user_id;
    const battleDate = new Date(item.created_at);
    
    return (
      <View style={[styles.historyItem, isDark && styles.historyItemDark]}>
        <View style={styles.historyHeader}>
          <ThemedText style={[
            styles.historyResult,
            isWin ? styles.historyWin : styles.historyLoss
          ]}>
            {isWin ? 'Victory' : 'Defeat'}
          </ThemedText>
          <ThemedText style={styles.historyDate}>
            {format(battleDate, 'MMM d, h:mm a')}
          </ThemedText>
        </View>
        
        <View style={styles.historyTeams}>
          <View style={styles.historyTeam}>
            <ThemedText style={styles.historyTeamLabel}>Your Team</ThemedText>
            <View style={styles.historyTeamMembers}>
              {item.user_team.map((digimon: any) => (
                <View key={digimon.id} style={styles.historyTeamMember}>
                  <DigimonSprite 
                    digimonName={digimon.digimon?.name}
                    fallbackSpriteUrl={digimon.digimon?.sprite_url}
                    size="xxs"
                    showHappinessAnimations={false}
                  />
                  <ThemedText style={styles.historyDigimonLevel}>
                    Lv.{digimon.current_level || digimon.level}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.historyVs}>
            <ThemedText style={styles.historyVsText}>VS</ThemedText>
          </View>
          
          <View style={styles.historyTeam}>
            <ThemedText style={styles.historyTeamLabel}>{item.opponent?.username || 'Opponent'}</ThemedText>
            <View style={styles.historyTeamMembers}>
              {item.opponent_team.map((digimon: any) => (
                <View key={digimon.id} style={styles.historyTeamMember}>
                  <DigimonSprite 
                    digimonName={digimon.digimon?.name}
                    fallbackSpriteUrl={digimon.digimon?.sprite_url}
                    size="xxs"
                    showHappinessAnimations={false}
                  />
                  <ThemedText style={styles.historyDigimonLevel}>
                    Lv.{digimon.current_level || digimon.level}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Battle Arena</ThemedText>
        <ThemedText style={styles.subtitle}>
          Daily Battles: {localDailyBattlesRemaining} remaining
        </ThemedText>
      </View>
      
      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'battle' && styles.activeTab]} 
          onPress={() => setActiveTab('battle')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'battle' && styles.activeTabText]}>
            Battle
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'team' && styles.activeTab]} 
          onPress={() => setActiveTab('team')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'team' && styles.activeTabText]}>
            Team
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Loading indicator */}
      {(loading || localLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3D7BF4" />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      )}
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}
      
      {/* Content based on active tab */}
      {activeTab === 'battle' && (
        <ScrollView style={styles.contentContainer}>
          <View style={styles.battleOptionsContainer}>
            {localBattleOptions.map((option) => (
              <View key={option.id} style={styles.battleOptionWrapper}>
                {renderBattleOption({ item: option })}
              </View>
            ))}
            
            {localBattleOptions.length === 0 && !loading && !localLoading && (
              <View style={styles.emptyStateContainer}>
                <ThemedText style={styles.emptyStateText}>
                  No battle options available. Try adding more Digimon to your team.
                </ThemedText>
              </View>
            )}
          </View>
          
          <View style={styles.infoContainer}>
            <ThemedText style={styles.infoText}>
              Battles reward all your Digimon with experience. Battle options refresh after each battle.
            </ThemedText>
          </View>
        </ScrollView>
      )}
      
      {activeTab === 'team' && (
        <ScrollView style={styles.contentContainer}>
          <View style={styles.teamSection}>
            <ThemedText style={styles.sectionTitle}>
              Team ({teamDigimon.length}/3)
            </ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Select up to 3 Digimon for your team
            </ThemedText>
            
            {teamDigimon.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <ThemedText style={styles.emptyStateText}>
                  You don't have any Digimon on your team yet.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.teamList}>
                {teamDigimon.map((digimon) => (
                  <View key={digimon.id} style={styles.teamMemberWrapper}>
                    {renderTeamMember({ item: digimon })}
                  </View>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.teamSection}>
            <ThemedText style={styles.sectionTitle}>Reserve</ThemedText>
            
            {nonTeamDigimon.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <ThemedText style={styles.emptyStateText}>
                  You don't have any other Digimon available.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.teamList}>
                {nonTeamDigimon.map((digimon) => (
                  <View key={digimon.id} style={styles.teamMemberWrapper}>
                    {renderTeamMember({ item: digimon })}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
      
      {activeTab === 'history' && (
        <FlatList
          style={styles.contentContainer}
          data={teamBattleHistory}
          renderItem={renderBattleHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyList}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <ThemedText style={styles.emptyStateText}>
                You haven't fought any battles yet.
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Battle Animation */}
      {currentTeamBattle && showBattleAnimation && (
        <TeamBattleAnimation
          teamBattle={currentTeamBattle}
          onComplete={handleBattleAnimationComplete}
          visible={showBattleAnimation}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#D32F2F',
  },
  battleOptionsContainer: {
    padding: 16,
  },
  battleOptionWrapper: {
    marginBottom: 16,
  },
  battleOptionCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  battleOptionCardDark: {
    borderWidth: 1,
    borderColor: '#424242',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#1E1E1E'
  },
  selectedBattleOption: {
    borderColor: '#3D7BF4',
    backgroundColor: 'rgba(61, 123, 244, 0.05)',
  },
  battleOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  easyBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  mediumBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  hardBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  opponentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  battleTeamContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  battleTeamMember: {
    alignItems: 'center',
  },
  battleSpriteContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeAttributeContainer: {
    marginVertical: 4,
  },
  battleDigimonLevel: {
    fontSize: 12,
  },
  battleButton: {
    backgroundColor: '#3D7BF4',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  battleButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  teamSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  teamList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  teamMemberWrapper: {
    width: '33%',
    padding: 4,
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  teamMemberCardDark: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#424242',
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
  },
  activeTeamMember: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  teamMemberSprite: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamMemberInfo: {
    flex: 1,
    marginLeft: 8,
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: '500',
  },
  teamMemberLevel: {
    fontSize: 10,
    opacity: 0.7,
    fontWeight: 'bold',
  },
  teamMemberStatus: {
    marginLeft: 8,
  },
  historyList: {
    padding: 16,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  historyItemDark: {
    borderWidth: 1,
    borderColor: '#424242',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#1E1E1E',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyResult: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyWin: {
    color: '#4CAF50',
  },
  historyLoss: {
    color: '#F44336',
  },
  historyDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  historyTeams: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTeam: {
    flex: 1,
  },
  historyTeamLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  historyTeamMembers: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  historyTeamMember: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  historyDigimonLevel: {
    fontSize: 10,
    marginTop: 2,
  },
  historyVs: {
    paddingHorizontal: 8,
  },
  historyVsText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
}); 