import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import DigimonSprite from './DigimonSprite';
import { TeamBattle } from '@/stores/battleStore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { DigimonAttribute, DigimonType } from '@/stores/battleStore';
import TypeAttributeIcon from './TypeAttributeIcon';
import { ANIMATED_DIGIMON } from '@/constants/animatedDigimonList';

interface TeamBattleAnimationProps {
  teamBattle: TeamBattle;
  onComplete: () => void;
  visible: boolean;
}

// Constants for battle animation
const DEFAULT_MAX_HP = 100;
const BASE_TURN_DURATION = 1500;
const FINAL_MESSAGE_DURATION = 2000;

// Function to get the correct sprite URL
function getBattleSpriteUrl(
  digimonName: string,
  spriteType: string,
  fallbackUrl: string
): string {
  // Check if this Digimon has animated sprites
  if (ANIMATED_DIGIMON.includes(digimonName)) {
    return `assets/animated_digimon/${digimonName}/${spriteType}.png`;
  }
  // Return the fallback URL for Digimon without animated sprites
  return fallbackUrl;
}

const TeamBattleAnimation: React.FC<TeamBattleAnimationProps> = ({
  teamBattle,
  onComplete,
  visible
}) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // State for battle animation
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showResultsScreen, setShowResultsScreen] = useState(false);
  const [hpState, setHpState] = useState<{ [id: string]: number }>({});
  const [disintegratingDigimon, setDisintegratingDigimon] = useState<{[id: string]: boolean}>({});
  const [animatedSprites, setAnimatedSprites] = useState<{[id: string]: boolean}>({});
  const [spriteTypes, setSpriteTypes] = useState<{[id: string]: string}>({});
  const [celebrateToggle, setCelebrateToggle] = useState(false);
  // Keep track of which Digimon should be flipped horizontally
  const [flipState, setFlipState] = useState<{[id: string]: boolean}>({});
  
  // Animation timing references
  const advanceStepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showResultsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Extract data from the battle
  const userTeam = teamBattle.user_team || [];
  const opponentTeam = teamBattle.opponent_team || [];
  const battleTurns = teamBattle.turns || [];
  const playerWon = teamBattle.winner_id === userTeam[0]?.user_id;
  const totalTurns = battleTurns.length;
  
  // Define steps of battle
  const maxSteps = 1 + totalTurns + 1; // intro + turns + final message
  const currentTurn = step > 0 && step <= totalTurns ? battleTurns[step - 1] : null;
  const isFinalMessageStep = step === maxSteps - 1;
  
  // Shared animation values
  const attackerTranslateX = useSharedValue(0);
  const attackerTranslateY = useSharedValue(0);
  const defenderShake = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartTranslateY = useSharedValue(0);
  
  // Initialize battle state
  useEffect(() => {
    // Initialize HP state
    const initialHp: { [id: string]: number } = {};
    
    // Set initial HP for all Digimon
    teamBattle.user_team?.forEach(fighter => {
      initialHp[fighter.id] = fighter.stats?.hp ?? DEFAULT_MAX_HP;
    });
    
    opponentTeam?.forEach(fighter => {
      initialHp[fighter.id] = fighter.stats?.hp ?? DEFAULT_MAX_HP;
    });
    
    setHpState(initialHp);
    setStep(0);
    setShowResults(false);
    setShowResultsScreen(false);
    setDisintegratingDigimon({});
    
    // Initialize flip state for all Digimon
    const initialFlipState: { [id: string]: boolean } = {};
    teamBattle.user_team?.forEach(fighter => {
      // User team Digimon should be flipped (scaleX: -1)
      initialFlipState[fighter.id] = true;
    });
    
    opponentTeam?.forEach(fighter => {
      // Opponent team Digimon should not be flipped (scaleX: 1)
      initialFlipState[fighter.id] = false;
    });
    
    setFlipState(initialFlipState);
    
    // Reset animation values
    attackerTranslateX.value = 0;
    attackerTranslateY.value = 0;
    defenderShake.value = 0;
    
    // Clear any existing timers
    if (advanceStepTimeoutRef.current) clearTimeout(advanceStepTimeoutRef.current);
    if (showResultsTimeoutRef.current) clearTimeout(showResultsTimeoutRef.current);
    advanceStepTimeoutRef.current = null;
    showResultsTimeoutRef.current = null;
    
    // Initialize animated sprites state
    const hasAnimated: {[id: string]: boolean} = {};
    const initialSpriteTypes: {[id: string]: string} = {};
    
    // Check which Digimon have animated sprites
    [...userTeam, ...opponentTeam].forEach(fighter => {
      const digimonName = fighter.digimon_name || "";
      hasAnimated[fighter.id] = ANIMATED_DIGIMON.includes(digimonName);
      initialSpriteTypes[fighter.id] = "idle1";
    });
    
    setAnimatedSprites(hasAnimated);
    setSpriteTypes(initialSpriteTypes);
    
    // Start battle with a small delay
    const initialTimer = setTimeout(() => {
      if (step === 0) {
        setStep(1);
      }
    }, 500);
    
    return () => {
      clearTimeout(initialTimer);
      if (advanceStepTimeoutRef.current) clearTimeout(advanceStepTimeoutRef.current);
      if (showResultsTimeoutRef.current) clearTimeout(showResultsTimeoutRef.current);
    };
  }, [teamBattle]);
  
  // Update HP based on battle turns
  useEffect(() => {
    if (step > 0 && currentTurn && currentTurn.remainingHP) {
      setHpState(prevHp => {
        const newHp = { ...prevHp };
        Object.keys(currentTurn.remainingHP).forEach(id => {
          if (newHp.hasOwnProperty(id)) {
            newHp[id] = Math.max(0, currentTurn.remainingHP[id]);
          }
        });
        return newHp;
      });
    }
  }, [step, currentTurn?.remainingHP]);
  
  // Handle disintegration effects when Digimon's HP reaches 0
  useEffect(() => {
    // Check for newly dead Digimon
    const newlyDead: {[id: string]: boolean} = {};
    
    // Check all Digimon
    [...userTeam, ...opponentTeam].forEach(fighter => {
      const currentHp = hpState[fighter.id] ?? (fighter.stats?.hp ?? DEFAULT_MAX_HP);
      const wasAlreadyDisintegrating = disintegratingDigimon[fighter.id];
      
      // If HP is 0 or less and not already disintegrating, mark for disintegration
      if (currentHp <= 0 && !wasAlreadyDisintegrating) {
        newlyDead[fighter.id] = true;
      }
    });
    
    // If we found newly dead Digimon, update the disintegrating state
    if (Object.keys(newlyDead).length > 0) {
      setDisintegratingDigimon(prev => ({...prev, ...newlyDead}));
    }
  }, [hpState]);
  
  // Update sprite types based on current turn
  useEffect(() => {
    if (!currentTurn) return;
    
    const newSpriteTypes = { ...spriteTypes };
    
    // Set attacker to attack sprite
    if (currentTurn.attacker && animatedSprites[currentTurn.attacker.id]) {
      newSpriteTypes[currentTurn.attacker.id] = "attack";
    }
    
    // Set defender to angry sprite
    if (currentTurn.target && animatedSprites[currentTurn.target.id]) {
      newSpriteTypes[currentTurn.target.id] = "angry";
    }
    
    setSpriteTypes(newSpriteTypes);
    
    // Reset sprites after animation
    const resetTimeout = setTimeout(() => {
      const resetTypes = { ...newSpriteTypes };
      Object.keys(resetTypes).forEach(id => {
        resetTypes[id] = "idle1";
      });
      setSpriteTypes(resetTypes);
    }, BASE_TURN_DURATION / 2);
    
    return () => clearTimeout(resetTimeout);
  }, [currentTurn, animatedSprites]);
  
  // Handle attack animations
  useEffect(() => {
    if (!currentTurn) return;
    
    const attackerId = currentTurn.attacker?.id;
    const targetId = currentTurn.target?.id;
    
    if (!attackerId || !targetId) return;
    
    // Determine direction and distance for attack movement
    const attackerTeam = currentTurn.attacker.team;
    const isUserAttacking = attackerTeam === 'user';
    
    // Calculate attack distance (30% of screen width)
    const attackDistance = screenWidth * 0.4;
    
    // Set movement direction based on which team is attacking
    const moveDirection = isUserAttacking ? 1 : -1;
    
    // Find attacker and target vertical positions to calculate y-axis movement
    const attackerIndex = findDigimonIndexById(attackerId, isUserAttacking ? 'user' : 'opponent');
    const targetIndex = findDigimonIndexById(targetId, isUserAttacking ? 'opponent' : 'user');
    
    const attackerTeamSize = isUserAttacking ? userTeam.length : opponentTeam.length;
    const targetTeamSize = isUserAttacking ? opponentTeam.length : userTeam.length;
    
    const attackerYPos = calculateVerticalPosition(attackerIndex, attackerTeamSize);
    const targetYPos = calculateVerticalPosition(targetIndex, targetTeamSize);
    
    // Calculate vertical movement needed
    const verticalOffset = targetYPos - attackerYPos;
    
    // Animate the attacker moving towards the target
    attackerTranslateX.value = 0; // Reset position
    attackerTranslateY.value = 0; // Reset vertical position
    
    // First move towards the target (both horizontally and vertically)
    attackerTranslateX.value = withSequence(
      withTiming(moveDirection * attackDistance, { 
        duration: 300, 
        easing: Easing.out(Easing.cubic) 
      }),
      // Then move back to original position
      withTiming(0, { 
        duration: 300, 
        easing: Easing.out(Easing.cubic) 
      })
    );
    
    // Vertical movement (move to target's height)
    attackerTranslateY.value = withSequence(
      withTiming(verticalOffset * 0.7, { // Only move 70% of the way to look more natural
        duration: 300,
        easing: Easing.out(Easing.cubic)
      }),
      // Then move back to original vertical position
      withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic)
      })
    );
    
    // Shake the defender when hit (if attack doesn't miss)
    if (!currentTurn.didMiss) {
      defenderShake.value = withSequence(
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [currentTurn, attackerTranslateX, attackerTranslateY, defenderShake]);
  
  // Set up celebration animation for results screen
  useEffect(() => {
    if (!showResultsScreen) return;
    
    const interval = setInterval(() => {
      setCelebrateToggle(prev => !prev);
    }, 500);
    
    return () => clearInterval(interval);
  }, [showResultsScreen]);
  
  // Auto-advance through battle steps
  useEffect(() => {
    // Clear previous timer first
    if (advanceStepTimeoutRef.current) {
      clearTimeout(advanceStepTimeoutRef.current);
      advanceStepTimeoutRef.current = null;
    }

    // Set next timer only if we are before the final message step and not showing results yet
    if (!showResults && step < maxSteps - 1) { 
      advanceStepTimeoutRef.current = setTimeout(advanceStep, BASE_TURN_DURATION); 
    }

    // Cleanup
    return () => {
      if (advanceStepTimeoutRef.current) {
        clearTimeout(advanceStepTimeoutRef.current);
        advanceStepTimeoutRef.current = null;
      }
    };
  }, [step, showResults]);
  
  // Show results after final message
  useEffect(() => {
    // Clear previous timer first
    if (showResultsTimeoutRef.current) {
      clearTimeout(showResultsTimeoutRef.current);
      showResultsTimeoutRef.current = null;
    }

    // If we're at the final message step and not already showing results screen
    if (isFinalMessageStep && !showResultsScreen) {
      showResultsTimeoutRef.current = setTimeout(() => {
        setShowResultsScreen(true);
      }, FINAL_MESSAGE_DURATION);
    }

    // Cleanup
    return () => {
      if (showResultsTimeoutRef.current) {
        clearTimeout(showResultsTimeoutRef.current);
        showResultsTimeoutRef.current = null;
      }
    };
  }, [step, isFinalMessageStep, showResultsScreen]);
  
  // Function to advance to the next step
  const advanceStep = () => {
    if (step < maxSteps - 1) {
      setStep(prevStep => prevStep + 1);
    }
  };
  
  // Function to get the display name of a fighter
  const getDisplayName = (fighter: any) => fighter.name !== "" ? fighter.name : fighter.digimon_name;
  
  // Function to find the index of a Digimon by ID
  const findDigimonIndexById = (id: string, team: 'user' | 'opponent') => {
    const teamArray = team === 'user' ? userTeam : opponentTeam;
    return teamArray.findIndex(digimon => digimon.id === id);
  };
  
  // Calculate if a hit is critical or missed
  const renderAttackDescription = () => {
    if (!currentTurn) return null;
    
    const attackerName = getAttackerName(currentTurn);
    
    if (currentTurn.didMiss) {
      return `${attackerName} misses the attack!`;
    } else if (currentTurn.isCriticalHit) {
      return `${attackerName} attacks critically for ${currentTurn.damage} damage!`;
    } else {
      return `${attackerName} attacks for ${currentTurn.damage} damage!`;
    }
  };
  
  // Get the name of the attacker
  const getAttackerName = (turn: any) => {
    const attackerTeam = turn.attacker.team;
    const attackerId = turn.attacker.id;
    const attacker = attackerTeam === 'user'
      ? userTeam.find(d => d.id === attackerId)
      : opponentTeam.find(d => d.id === attackerId);
    return attacker ? getDisplayName(attacker) : "Unknown";
  };
  
  // Calculate vertical positions for teams
  const calculateVerticalPosition = (index: number, teamSize: number) => {
    // Use 70% of screen height for team positioning instead of 30%
    const totalHeight = screenHeight * 0.8;
    
    // If only one Digimon, center it vertically
    if (teamSize === 1) {
      return screenHeight * 0.4; // Position at 40% of screen height
    }
    
    // Calculate spacing between team members
    const spacing = totalHeight / (teamSize + 1); // Add +1 for better spacing
    
    // Position based on index, with offset to center the team
    return spacing * (index + 1); // Start from 1/4 down the screen
  };
  
  // Create a cached styles object for default styling to avoid recreating on every render
  const userTeamDefaultStyle = {
    transform: [{ scaleX: -1 }]
  };

  const opponentTeamDefaultStyle = {
    transform: [{ scaleX: 1 }]
  };

  // Animation style for the attacker
  const attackerAnimatedStyle = useAnimatedStyle(() => {
    // Get the attacker ID
    const attackerId = currentTurn?.attacker?.id;
    // Use the flip state if available, otherwise fall back to team check
    const shouldFlip = attackerId ? flipState[attackerId] : currentTurn?.attacker?.team === 'user';
    
    return {
      transform: [
        { translateX: attackerTranslateX.value },
        { translateY: attackerTranslateY.value },
        // Use the flip state to determine direction
        { scaleX: shouldFlip ? -1 : 1 }
      ]
    };
  });

  // Animation style for the target
  const targetAnimatedStyle = useAnimatedStyle(() => {
    // Get the target ID
    const targetId = currentTurn?.target?.id;
    // Use the flip state if available, otherwise fall back to team check
    const shouldFlip = targetId ? flipState[targetId] : currentTurn?.target?.team === 'user';
    
    return {
      transform: [
        { translateX: defenderShake.value },
        // Use the flip state to determine direction
        { scaleX: shouldFlip ? -1 : 1 }
      ]
    };
  });
  
  // Render a fighter in the battle scene
  const renderFighter = (fighter: any, isUserTeam: boolean, index: number, teamSize: number) => {
    const currentHp = hpState[fighter.id] ?? (fighter.stats?.hp ?? DEFAULT_MAX_HP);
    const maxHp = fighter.stats?.hp ?? DEFAULT_MAX_HP;
    const hpPercentage = maxHp > 0 ? Math.max(0, (currentHp / maxHp) * 100) : 0;
    const isDead = currentHp <= 0;
    const isDisintegrating = disintegratingDigimon[fighter.id];
    
    // Get the appropriate sprite
    const digimonName = fighter.digimon_name || "";
    const hasAnimatedSprite = animatedSprites[fighter.id];
    const spriteType = spriteTypes[fighter.id] || "idle1";
    
    // Calculate vertical position
    const yPosition = calculateVerticalPosition(index, teamSize);
    
    // Adjust horizontal positions to better use screen width
    // Use more extreme percentages to spread out fighters more
    const horizontalPosition = isUserTeam ? screenWidth * 0.08 : screenWidth * 0.82;
    
    // Check if this is current attacker or target
    const isCurrentAttacker = currentTurn && currentTurn.attacker && currentTurn.attacker.id === fighter.id;
    const isCurrentTarget = currentTurn && currentTurn.target && currentTurn.target.id === fighter.id;
    
    // Get the flip state for this fighter
    const shouldFlip = flipState[fighter.id] ?? isUserTeam;
    
    // Create a custom style for this fighter when not attacking or being targeted
    const customDefaultStyle = {
      transform: [{ scaleX: shouldFlip ? -1 : 1 }]
    };
    
    return (
      <Animated.View 
        key={fighter.id}
        style={[
          styles.fighterContainer,
          {
            left: isUserTeam ? horizontalPosition : undefined,
            right: !isUserTeam ? screenWidth - horizontalPosition : undefined,
            top: yPosition,
            opacity: isDead && !isDisintegrating ? 0.3 : 1,
          },
          // Use our pre-computed animated styles
          isCurrentAttacker ? attackerAnimatedStyle : isCurrentTarget ? targetAnimatedStyle : customDefaultStyle
        ]}
      >
        {/* Level badge */}
        <View style={[
          styles.levelBadge,
          // Flip the level badge back so text reads correctly
          shouldFlip && { transform: [{ scaleX: -1 }] }
        ]}>
          <ThemedText style={styles.levelText}>Lv.{fighter.current_level}</ThemedText>
        </View>
        
        {/* Digimon sprite */}
        <DigimonSprite 
          digimonName={digimonName}
          fallbackSpriteUrl={fighter.sprite_url}
          size="sm"
          showHappinessAnimations={false}
          currentSpriteType={hasAnimatedSprite ? spriteType as any : undefined}
        />
        
        {/* HP bar */}
        <View style={[
          styles.hpBarContainer,
          // Flip the HP bar back so it reads correctly
          shouldFlip && { transform: [{ scaleX: -1 }] }
        ]}>
          <View style={styles.hpBarBackground}>
            <Animated.View 
              style={[
                styles.hpBarFill,
                {
                  width: `${hpPercentage}%`,
                  backgroundColor: hpPercentage > 50 ? '#4CAF50' : hpPercentage > 20 ? '#FFC107' : '#F44336'
                }
              ]}
            />
          </View>
          <ThemedText style={styles.hpText}>
            {Math.ceil(currentHp)}/{Math.ceil(maxHp)}
          </ThemedText>
        </View>
      </Animated.View>
    );
  };
  
  // Render the battle scene
  const renderBattleScene = () => {
    return (
      <View style={styles.battleScene}>
        {/* User team */}
        <View style={styles.teamContainer}>
          {userTeam.map((fighter, index) => renderFighter(fighter, true, index, userTeam.length))}
        </View>
        
        {/* Opponent team */}
        <View style={styles.teamContainer}>
          {opponentTeam.map((fighter, index) => renderFighter(fighter, false, index, opponentTeam.length))}
        </View>
        
        {/* Battle narration */}
        <View style={styles.narrationContainer}>
          {step === 0 && (
            <ThemedText style={styles.narrationText}>Team Battle start!</ThemedText>
          )}
          
          {currentTurn && (
            <ThemedText style={styles.narrationText}>
              {renderAttackDescription()}
            </ThemedText>
          )}
          
          {isFinalMessageStep && !showResults && (
            <ThemedText style={styles.narrationText}>
              {playerWon ? "Your team is victorious!" : "Your team has been defeated!"}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };
  
  // Render the results screen
  const renderResultsScreen = () => {
    return (
      <View style={styles.resultsContainer}>
        <ThemedText style={styles.resultTitle}>
          {playerWon ? "Victory!" : "Defeat!"}
        </ThemedText>
        
        {/* User team results */}
        <View style={styles.resultsTeamContainer}>
          {userTeam.map((fighter) => {
            // Use the XP gain directly from the battle result
            const xpGain = teamBattle.xpGain;
            const currentXP = fighter.experience_points || 0;
            const newXP = currentXP + xpGain;
            
            // Calculate level progress
            let currentLevel = fighter.current_level || 1;
            const xpForNextLevel = currentLevel * 20;
            const prevLevelProgress = (currentXP % xpForNextLevel) / xpForNextLevel * 100;
            
            // Check if leveled up
            const didLevelUp = newXP >= currentXP + xpForNextLevel - (currentXP % xpForNextLevel);
            const newLevelProgress = didLevelUp 
              ? ((newXP - currentXP - (xpForNextLevel - (currentXP % xpForNextLevel))) / ((currentLevel + 1) * 20)) * 100
              : (newXP % xpForNextLevel) / xpForNextLevel * 100;
            
            const newLevel = didLevelUp ? currentLevel + 1 : currentLevel;
            
            // Get the appropriate sprite based on outcome
            const digimonName = fighter.digimon_name || "";
            const hasAnimatedSprite = ANIMATED_DIGIMON.includes(digimonName);
            let spriteType = "idle1";
            
            if (hasAnimatedSprite) {
              if (playerWon) {
                spriteType = celebrateToggle ? "cheer" : "happy";
              } else {
                spriteType = celebrateToggle ? "sad1" : "sad2";
              }
            }
            
            return (
              <View key={fighter.id} style={styles.resultsFighter}>
                <DigimonSprite 
                  digimonName={digimonName}
                  fallbackSpriteUrl={fighter.sprite_url}
                  size="sm"
                  showHappinessAnimations={false}
                  currentSpriteType={hasAnimatedSprite ? spriteType as any : undefined}
                />
                
                <View style={styles.fighterInfo}>
                  <ThemedText style={styles.fighterName}>
                    {getDisplayName(fighter)}
                  </ThemedText>
                  
                  <ThemedText style={styles.fighterLevel}>
                    {didLevelUp ? `Lv. ${currentLevel} → ${newLevel}` : `Lv. ${currentLevel}`}
                  </ThemedText>
                  
                  {xpGain > 0 && (
                    <View style={styles.xpBarContainer}>
                      <View style={styles.xpBarBackground}>
                        <Animated.View 
                          style={[
                            styles.xpBarFill,
                            { width: `${newLevelProgress}%` }
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.xpText}>+{xpGain} XP</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        
        {/* XP message */}
        {teamBattle.xpGain > 0 && (
          <ThemedText style={styles.xpMessage}>
            Your reserve Digimon also gained some XP!
          </ThemedText>
        )}
        
        {/* Bits reward */}
        {teamBattle.bitsReward > 0 && (
          <ThemedText style={styles.bitsMessage}>
            You earned {teamBattle.bitsReward} bits!
          </ThemedText>
        )}
        
        {/* Hint for losing */}
        {teamBattle.hint && !playerWon && (
          <ThemedText style={styles.hintMessage}>
            {teamBattle.hint}
          </ThemedText>
        )}
        
        {/* Return button */}
        <TouchableOpacity
          style={styles.returnButton}
          onPress={onComplete}
        >
          <ThemedText style={styles.returnButtonText}>Return</ThemedText>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
    >
      <ThemedView style={styles.container}>
        {!showResultsScreen ? renderBattleScene() : renderResultsScreen()}
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  battleScene: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  teamContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
  },
  fighterContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1,
  },
  levelBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 12,
    color: 'white',
  },
  hpBarContainer: {
    width: 120,
    alignItems: 'center',
    marginTop: 4,
  },
  hpBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  hpText: {
    fontSize: 10,
    marginTop: 2,
  },
  narrationContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  narrationText: {
    fontSize: 18,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    width: '100%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  resultsTeamContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  resultsFighter: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
  },
  fighterInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  fighterName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fighterLevel: {
    fontSize: 12,
    marginBottom: 8,
  },
  xpBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  xpBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  xpText: {
    fontSize: 10,
    marginTop: 4,
  },
  xpMessage: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
  },
  bitsMessage: {
    fontSize: 14,
    color: '#FFC107',
    textAlign: 'center',
    marginBottom: 10,
  },
  hintMessage: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  returnButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  returnButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TeamBattleAnimation; 