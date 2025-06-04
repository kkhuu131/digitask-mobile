import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useDigimonStore, UserDigimon } from '@/stores/petStore';
import DigimonSprite from '@/components/DigimonSprite';
import { Button } from '@rneui/themed';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Toast from 'react-native-toast-message';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SimpleProgressBar } from '@/components/ui/SimpleProgressBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DigimonAttribute } from '@/stores/battleStore';
import { DigimonType } from '@/stores/battleStore';
import TypeAttributeIcon from '@/components/TypeAttributeIcon';

export default function DigimonScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const { 
    allUserDigimon, 
    userDigimon, 
    fetchAllUserDigimon, 
    fetchUserDigimon, 
    setActiveDigimon 
  } = useDigimonStore();
  
  const [loading, setLoading] = useState(false);
  
  // Fetch all Digimon data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchAllUserDigimon();
        await fetchUserDigimon();
      } catch (error) {
        console.error('Error loading Digimon data:', error);
        Toast.show({
          type: 'error',
          text1: 'Error loading Digimon',
          text2: 'Please try again later',
          position: 'top',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Handle setting a Digimon as active
  const handleSetActive = async (digimonId: string) => {
    // Don't do anything if this is already the active Digimon
    if (userDigimon?.id === digimonId) {
      Toast.show({
        type: 'info',
        text1: 'Already Active',
        text2: 'This Digimon is already your active partner',
        position: 'top',
      });
      return;
    }
    
    // Confirm with the user
    Alert.alert(
      "Change Active Digimon?",
      "Do you want to set this Digimon as your active partner?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            try {
              await setActiveDigimon(digimonId);
              Toast.show({
                type: 'success',
                text1: 'Active Digimon Changed',
                position: 'top',
              });
            } catch (error) {
              console.error('Error setting active Digimon:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not change active Digimon',
                position: 'top',
              });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Handle viewing Digimon details
  const handleViewDetails = (digimon: UserDigimon) => {
    router.push({
      pathname: '/digimon-details',
      params: { digimonId: digimon.id }
    });
  };

  const calculateLevelProgress = (digimon: UserDigimon) => {
    const maxExp = digimon.current_level * 20;
    return digimon.experience_points / maxExp;
  };
  
  // Render a Digimon card
  const renderDigimonCard = ({ item }: { item: UserDigimon }) => {
    const isActive = userDigimon?.id === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.digimonCard,
          isDark ? styles.digimonCardDark : null,
          isActive ? styles.activeDigimonCard : null
        ]}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          {/* {isActive && (
            <View style={styles.activeIndicator}>
              <ThemedText style={styles.activeText}>Active</ThemedText>
            </View>
          )} */}
        </View>
        
        <View style={styles.spriteContainer}>
          <DigimonSprite 
            digimonName={item.digimon?.name || "Unknown"}
            fallbackSpriteUrl={item.digimon?.sprite_url || ""}
            happiness={item.happiness}
            size="sm"
            enableHopping={false}
          />
        </View>
        
        <View style={styles.infoContainer}>
          <ThemedText style={styles.digimonName} numberOfLines={1}>
            {item.name || item.digimon?.name}
          </ThemedText>
          <ThemedText style={styles.levelText}>
            Lv. {item.current_level}
          </ThemedText>
          <SimpleProgressBar
            style={styles.progressBar}
            progress={calculateLevelProgress(item as UserDigimon)}
            color="#3D7BF4"
          />
        </View>
        
        {!isActive && (
          <TouchableOpacity 
            style={styles.setActiveButton}
            onPress={() => handleSetActive(item.id)}
          >
            <IconSymbol name="star" size={18} color="#FFC107" />
          </TouchableOpacity>
        )}

        <View style={styles.typeAttributeContainer}>
          <TypeAttributeIcon type={item.digimon?.type as DigimonType} attribute={item.digimon?.attribute as DigimonAttribute} size="sm" />
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>My Digimon</ThemedText>
          <ThemedText style={styles.subtitle}>
            {allUserDigimon.length} Digimon in your collection
          </ThemedText>
        </View>
        
        {allUserDigimon.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              You don't have any Digimon yet!
            </ThemedText>
            <Button
              title="Get your first Digimon"
              onPress={() => router.push('/explore')}
              buttonStyle={styles.getDigimonButton}
            />
          </View>
        ) : (
          <FlatList
            data={allUserDigimon.sort((a, b) => {
              // First sort by is_active (true comes first)
              if (a.is_active && !b.is_active) return -1;
              if (!a.is_active && b.is_active) return 1;
              // Then sort by current_level
              return b.current_level - a.current_level;
            })}
            renderItem={renderDigimonCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={styles.columnWrapper}
          />
        )}
      </ThemedView>
    </GestureHandlerRootView>
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
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    paddingTop: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  digimonCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    padding: 12,
  },
  digimonCardDark: {
    backgroundColor: '#2C2C2E',
  },
  activeDigimonCard: {
    borderWidth: 2,
    borderColor: '#3D7BF4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  activeIndicator: {
    backgroundColor: '#3D7BF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  spriteContainer: {
    alignItems: 'center',
    marginBottom: 8,
    height: 80,
    justifyContent: 'center',
  },
  infoContainer: {
    alignItems: 'center',
  },
  digimonName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  digimonSpecies: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 12,
    opacity: 0.8,
  },
  setActiveButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  typeAttributeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  getDigimonButton: {
    backgroundColor: '#3D7BF4',
    paddingHorizontal: 24,
  },
}); 