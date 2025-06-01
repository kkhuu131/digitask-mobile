import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, SamplingOptions, MipmapMode, FilterMode } from '@shopify/react-native-skia';
import { getImageByPath } from '../utils/generatedImageMap';

interface PixelatedImageProps {
  source: any;
  style?: {
    width?: number;
    height?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
  };
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

/**
 * Renders a pixelated image using React Native Skia for crisp pixel art
 */
const PixelatedImage: React.FC<PixelatedImageProps> = ({ 
  source, 
  style = { width: 100, height: 100 },
  resizeMode = 'contain'
}) => {
  // Get the image path from source
  const resolveImagePath = () => {
    if (!source) {
      // Return a placeholder or empty image
      return require('../assets/digimon/agumon_professor.png');
    }

    if (typeof source === 'string') {
      return getImageByPath(source);
    }
    return source;
  };

  // On web, fall back to regular Image with CSS
  if (Platform.OS === 'web') {
    return (
      <div 
        style={{
          width: style.width,
          height: style.height,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          backgroundImage: `url(${resolveImagePath()})`,
          backgroundSize: resizeMode === 'contain' ? 'contain' : 
                          resizeMode === 'cover' ? 'cover' : '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          imageRendering: 'pixelated', // This is the key CSS property for pixelated rendering
        }}
      />
    );
  }

  // For native platforms, use Skia
  const image = useImage(resolveImagePath());
  
  // Calculate dimensions based on resizeMode
  const getImageDimensions = () => {
    if (!image) return { x: 0, y: 0, width: 0, height: 0 };
    
    const canvasWidth = style.width || 100;
    const canvasHeight = style.height || 100;
    
    if (resizeMode === 'stretch') {
      return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
    }
    
    const imageRatio = image.width() / image.height();
    const canvasRatio = canvasWidth / canvasHeight;
    
    if (resizeMode === 'contain') {
      if (imageRatio > canvasRatio) {
        // Image is wider than canvas
        const height = canvasWidth / imageRatio;
        return { 
          x: 0, 
          y: (canvasHeight - height) / 2, 
          width: canvasWidth, 
          height 
        };
      } else {
        // Image is taller than canvas
        const width = canvasHeight * imageRatio;
        return { 
          x: (canvasWidth - width) / 2, 
          y: 0, 
          width, 
          height: canvasHeight 
        };
      }
    }
    
    if (resizeMode === 'cover') {
      if (imageRatio > canvasRatio) {
        // Image is wider than canvas
        const width = canvasHeight * imageRatio;
        return { 
          x: (canvasWidth - width) / 2, 
          y: 0, 
          width, 
          height: canvasHeight 
        };
      } else {
        // Image is taller than canvas
        const height = canvasWidth / imageRatio;
        return { 
          x: 0, 
          y: (canvasHeight - height) / 2, 
          width: canvasWidth, 
          height 
        };
      }
    }
    
    // Default/center
    return { 
      x: (canvasWidth - image.width()) / 2, 
      y: (canvasHeight - image.height()) / 2, 
      width: image.width(), 
      height: image.height() 
    };
  };

  return (
    <View style={[styles.container, { ...style }]}>
      <Canvas style={styles.canvas}>
        {image && (
          <SkiaImage
            image={image}
            x={getImageDimensions().x}
            y={getImageDimensions().y}
            width={getImageDimensions().width}
            height={getImageDimensions().height}
            fit="fill"
            sampling={{
              filter: FilterMode.Nearest,
              mipmap: MipmapMode.Nearest,
            }}
          />
        )}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
});

export default PixelatedImage; 