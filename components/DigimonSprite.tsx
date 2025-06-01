import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue,
  withSequence,
  withTiming, 
  withRepeat,
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { ANIMATED_DIGIMON } from '../constants/animatedDigimonList';
import { getSpriteUrl } from '../utils/spriteManager';
import type { SpriteType } from '../utils/spriteManager';
import PixelatedImage from './PixelatedImage';

interface DigimonSpriteProps {
  digimonName: string;
  fallbackSpriteUrl: string;
  happiness?: number;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  silhouette?: boolean;
  onPress?: () => void;
  showHappinessAnimations?: boolean;
  enableHopping?: boolean;
  currentSpriteType?: SpriteType;
}

const DigimonSprite: React.FC<DigimonSpriteProps> = ({
  digimonName,
  fallbackSpriteUrl = "/assets/digimon/agumon_professor.png",
  happiness = 100,
  size = 'md',
  silhouette = false,
  onPress,
  showHappinessAnimations = true,
  enableHopping = false,
  currentSpriteType: externalSpriteType
}) => {
  const [internalSpriteType, setInternalSpriteType] = useState<SpriteType>('idle1');
  const [hasAnimatedSprites, setHasAnimatedSprites] = useState(false);
  const [spriteToggle, setSpriteToggle] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lookDirection, setLookDirection] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation values
  const translateY = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartTranslateY = useSharedValue(0);

  // Check if this Digimon has animated sprites
  useEffect(() => {
    if (digimonName && ANIMATED_DIGIMON.includes(digimonName)) {
      setHasAnimatedSprites(true);
    } else {
      setHasAnimatedSprites(false);
    }
  }, [digimonName]);

  // Set up sprite animation interval
  useEffect(() => {
    if (!hasAnimatedSprites || !showHappinessAnimations || externalSpriteType) return;
    
    // Update sprite every 0.75 seconds for idle animation
    const interval = setInterval(() => {
      if (isAnimating) return;
      
      // Toggle the sprite state
      setSpriteToggle(prev => !prev);
      
      // Determine sprite type based on happiness and toggle state
      let newSpriteType: SpriteType;
      
      if (happiness > 80) {
        newSpriteType = spriteToggle ? "idle1" : "idle2";
      } else {
        newSpriteType = spriteToggle ? "sad1" : "sad2";
      }
      
      setInternalSpriteType(newSpriteType);
    }, 750);
    
    return () => clearInterval(interval);
  }, [hasAnimatedSprites, happiness, isAnimating, spriteToggle, showHappinessAnimations, externalSpriteType]);

  // Set up hopping animation
  useEffect(() => {
    if (enableHopping) {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.bounce }),
          withTiming(-3, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 200, easing: Easing.bounce }),
          withTiming(-5, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.bounce }),
          withTiming(0, { duration: 1000 }) // Pause before repeating
        ),
        -1, // Infinite repeat
        false
      );
    } else {
      translateY.value = 0;
    }
  }, [enableHopping]);

  // Use external sprite type if provided, otherwise use internal state
  const effectiveSpriteType = externalSpriteType || internalSpriteType;

  // Function to get the current sprite URL
  const getCurrentSpriteUrl = () => {
    if (hasAnimatedSprites && digimonName) {
      return getSpriteUrl(digimonName, effectiveSpriteType, fallbackSpriteUrl);
    }
    return fallbackSpriteUrl;
  };

  // Handle sprite press
  const handleSpritePress = () => {
    if (!onPress || isAnimating) return;
    
    setIsAnimating(true);
    
    // Look left and right sequence
    setTimeout(() => setLookDirection(-1), 200);
    setTimeout(() => setLookDirection(1), 400);
    
    // Show happy reaction temporarily for animated sprites
    if (hasAnimatedSprites && showHappinessAnimations && !externalSpriteType) {
      setInternalSpriteType('happy');
      setShowHeart(true);
      
      // Heart animation
      heartOpacity.value = 0;
      heartScale.value = 0;
      heartTranslateY.value = 0;
      
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(400, withTiming(0, { duration: 300 }))
      );
      
      heartScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 100 }),
        withDelay(300, withTiming(0, { duration: 300 }))
      );
      
      heartTranslateY.value = withTiming(-30, { duration: 1000 });
    }
    
    // Hopping animation for press
    translateY.value = withSequence(
      withTiming(-10, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.bounce }),
      withTiming(-7, { duration: 150, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 150, easing: Easing.bounce }),
      withTiming(0, { duration: 100 }, () => {
        runOnJS(finishAnimation)();
      })
    );
    
    // Call the provided onPress handler
    onPress();
  };
  
  // Function to finish animation sequence
  const finishAnimation = () => {
    setIsAnimating(false);
    setShowHeart(false);
    
    // Reset to normal sprite type based on happiness (only if we're managing the sprite internally)
    if (hasAnimatedSprites && showHappinessAnimations && !externalSpriteType) {
      if (happiness > 80) {
        setInternalSpriteType(spriteToggle ? "idle1" : "idle2");
      } else {
        setInternalSpriteType(spriteToggle ? "sad1" : "sad2");
      }
    }
  };

  // Size dimensions for container
  const getSizeStyle = () => {
    switch(size) {
      case 'xxs': return { width: 32, height: 24 };
      case 'xs': return { width: 32, height: 32 };
      case 'sm': return { width: 64, height: 64 };
      case 'md': return { width: 128, height: 128 };
      case 'lg': return { width: 256, height: 256 };
      case 'xl': return { width: 512, height: 512 };
      default: return { width: 128, height: 128 };
    }
  };
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }]
    };
  });
  
  const heartAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: heartOpacity.value,
      transform: [
        { translateY: heartTranslateY.value },
        { scale: heartScale.value }
      ]
    };
  });

  return (
    <View style={[styles.container, getSizeStyle()]}>
      <Animated.View style={[styles.spriteContainer, animatedStyle]}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={handleSpritePress}
          style={styles.touchable}
        >
          <PixelatedImage
            source={getCurrentSpriteUrl()}
            style={{
              width: getSizeStyle().width,
              height: getSizeStyle().height
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>
      
      {/* Heart animation */}
      {showHeart && (
        <Animated.View style={[styles.heartContainer, heartAnimatedStyle]}>
          <ThemedText style={[
            styles.heartText,
            size === 'sm' ? { fontSize: 18 } : 
            size === 'md' ? { fontSize: 22 } : 
            { fontSize: 30 }
          ]}>
            ❤️
          </ThemedText>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spriteContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartContainer: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  heartText: {
    textAlign: 'center',
  }
});

export default DigimonSprite; 