import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, ActivityIndicator, Modal, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useDigimonStore, Digimon } from '@/stores/petStore';
import DigimonSprite from '@/components/DigimonSprite';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ScrollView, GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DigimonAttribute } from '@/stores/battleStore';
import TypeAttributeIcon from '@/components/TypeAttributeIcon';
import { DigimonType } from '@/stores/battleStore';

interface DigimonListItem {
  id: number;
  name: string;
  sprite_url: string;
  stage: string;
  type: string;
  discovered: boolean;
}

export default function DigiDexScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets(); // Get safe area insets
  
  const { discoveredDigimon } = useDigimonStore();
  const [allDigimon, setAllDigimon] = useState<DigimonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDigimon, setSelectedDigimon] = useState<Digimon | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Fetch all Digimon data from the database
  useEffect(() => {
    const fetchAllDigimon = async () => {
      setLoading(true);
      try {
        // Get all Digimon from the database
        const { data, error } = await supabase
          .from('digimon')
          .select('digimon_id, name, sprite_url, stage, type')
          .order('digimon_id', { ascending: true });
          
        if (error) throw error;
        
        // Map the data to our format and mark discovered Digimon
        const mappedData = data.map(digimon => ({
          id: digimon.digimon_id,
          name: digimon.name,
          sprite_url: digimon.sprite_url,
          stage: digimon.stage,
          type: digimon.type,
          discovered: discoveredDigimon.includes(digimon.digimon_id)
        }));
        
        setAllDigimon(mappedData);
      } catch (error) {
        console.error('Error fetching Digimon list:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllDigimon();
  }, [discoveredDigimon]);
  
  // Handle selecting a Digimon to view details
  const handleSelectDigimon = async (digimon: DigimonListItem) => {
    try {
      // Fetch full Digimon details
      const { data, error } = await supabase
        .from('digimon')
        .select('*')
        .eq('digimon_id', digimon.id)
        .single();
        
      if (error) throw error;
      
      setSelectedDigimon(data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching Digimon details:', error);
    }
  };
  
  // Render each Digimon entry in the list
  const renderDigimonItem = ({ item }: { item: DigimonListItem }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.digimonItem,
          isDark ? styles.digimonItemDark : null
        ]}
        onPress={() => handleSelectDigimon(item)}
      >
        <View style={styles.spriteContainer}>
          <DigimonSprite
            digimonName={item.name}
            fallbackSpriteUrl={item.sprite_url}
            size="sm"
            silhouette={!item.discovered}
            showHappinessAnimations={false}
          />
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.idBadge}>
            <ThemedText style={styles.idText}>#{item.id.toString().padStart(3, '0')}</ThemedText>
          </View>
          
          <ThemedText style={styles.digimonName}>
            {item.discovered ? item.name : '???'}
          </ThemedText>
          
          <ThemedText style={styles.digimonStage}>
            {item.discovered ? item.stage : '???'}
          </ThemedText>
        </View>
        
        <IconSymbol name="chevron.right" size={20} color="#AAAAAA" />
      </TouchableOpacity>
    );
  };
  
  // DigiDex Entry Modal
  const renderDigimonDetailModal = () => {
    if (!selectedDigimon) return null;
    
    const isDiscovered = discoveredDigimon.includes(selectedDigimon.digimon_id);
    
    return (
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  {isDiscovered ? selectedDigimon.name : '???'}{' '}
                  {
                    isDiscovered && (
                      <TypeAttributeIcon type={selectedDigimon.type as DigimonType} attribute={selectedDigimon.attribute as DigimonAttribute} size="xs" />
                    )
                  }
                </ThemedText>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <IconSymbol name="xmark.circle.fill" size={24} color="#999" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollView}>
                <View style={styles.digimonDetailHeader}>
                  <View style={styles.digimonSpriteContainer}>
                    <DigimonSprite
                      digimonName={selectedDigimon.name}
                      fallbackSpriteUrl={selectedDigimon.sprite_url}
                      size="md"
                      silhouette={!isDiscovered}
                      showHappinessAnimations={false}
                    />
                  </View>
                  
                  <View style={styles.digimonInfoCard}>
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoLabel}>Number:</ThemedText>
                      <ThemedText style={styles.infoValue}>
                        #{selectedDigimon.digimon_id.toString().padStart(3, '0')}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoLabel}>Stage:</ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {isDiscovered ? selectedDigimon.stage : '???'}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoLabel}>Type:</ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {isDiscovered ? selectedDigimon.type : '???'}
                      </ThemedText>
                    </View>
                    
                    <View style={styles.infoRow}>
                      <ThemedText style={styles.infoLabel}>Attribute:</ThemedText>
                      <ThemedText style={styles.infoValue}>
                        {isDiscovered ? selectedDigimon.attribute : '???'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                
                {isDiscovered && (
                  <>
                    <View style={styles.statsSection}>
                      <ThemedText style={styles.sectionTitle}>Base Stats</ThemedText>
                      
                      <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>HP</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.hp_level99}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>SP</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.sp_level1}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>ATK</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.atk_level1}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>DEF</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.def_level1}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>INT</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.int_level1}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>SPD</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.spd_level1}</ThemedText>
                          </View>
                      </View>

                      <View style={styles.growthContainer}>
                        <ThemedText style={styles.growthTitle}>Growth at Lv.50</ThemedText>
                        
                        <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                          <ThemedText style={styles.statLabel}>HP</ThemedText>
                          <ThemedText style={styles.statValue}>{selectedDigimon.hp}</ThemedText>
                        </View>
                        
                        <View style={styles.statItem}>
                          <ThemedText style={styles.statLabel}>SP</ThemedText>
                          <ThemedText style={styles.statValue}>{selectedDigimon.sp}</ThemedText>
                        </View>
                        
                        <View style={styles.statItem}>
                          <ThemedText style={styles.statLabel}>ATK</ThemedText>
                          <ThemedText style={styles.statValue}>{selectedDigimon.atk}</ThemedText>
                        </View>
                        
                        <View style={styles.statItem}>
                          <ThemedText style={styles.statLabel}>DEF</ThemedText>
                          <ThemedText style={styles.statValue}>{selectedDigimon.def}</ThemedText>
                        </View>
                        
                        <View style={styles.statItem}>
                          <ThemedText style={styles.statLabel}>INT</ThemedText>
                          <ThemedText style={styles.statValue}>{selectedDigimon.int}</ThemedText>
                        </View>
                        
                        <View style={styles.statItem}>
                          <ThemedText style={styles.statLabel}>SPD</ThemedText>
                          <ThemedText style={styles.statValue}>{selectedDigimon.spd}</ThemedText>
                        </View>
                        </View>
                      </View>
                      
                      <View style={styles.growthContainer}>
                        <ThemedText style={styles.growthTitle}>Growth at Lv.99</ThemedText>
                        
                        <View style={styles.statsGrid}>
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>HP</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.hp_level99}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>SP</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.sp_level99}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>ATK</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.atk_level99}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>DEF</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.def_level99}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>INT</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.int_level99}</ThemedText>
                          </View>
                          
                          <View style={styles.statItem}>
                            <ThemedText style={styles.statLabel}>SPD</ThemedText>
                            <ThemedText style={styles.statValue}>{selectedDigimon.spd_level99}</ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>
                  </>
                )}
                
                {!isDiscovered && (
                  <View style={styles.undiscoveredMessage}>
                    <IconSymbol name="lock.fill" size={32} color="#999" />
                    <ThemedText style={styles.undiscoveredText}>
                      You haven't discovered this Digimon yet.
                    </ThemedText>
                    <ThemedText style={styles.undiscoveredHint}>
                      Continue your adventure to discover more Digimon!
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            </ThemedView>
          </View>
        </GestureHandlerRootView>
      </Modal>
    );
  };
  
  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3D7BF4" />
          <ThemedText style={styles.loadingText}>Loading DigiDex...</ThemedText>
        </View>
      </ThemedView>
    );
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>DigiDex</ThemedText>
          <ThemedText style={styles.subtitle}>
            Discovered: {discoveredDigimon.length} / {allDigimon.length}
          </ThemedText>
        </View>
        
        <FlatList
          data={allDigimon}
          renderItem={renderDigimonItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
        
        {renderDigimonDetailModal()}
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  digimonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 6,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  digimonItemDark: {
    backgroundColor: '#2C2C2E',
  },
  spriteContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  idBadge: {
    backgroundColor: 'rgba(61, 123, 244, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  idText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3D7BF4',
  },
  digimonName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  digimonStage: {
    fontSize: 12,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  digimonDetailHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  digimonSpriteContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digimonInfoCard: {
    flex: 1,
    marginLeft: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    marginBottom: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  growthContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(61, 123, 244, 0.1)',
    borderRadius: 8,
  },
  growthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  undiscoveredMessage: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undiscoveredText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  undiscoveredHint: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
}); 