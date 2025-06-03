// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle, StyleSheet, ViewStyle } from 'react-native';
import React from 'react';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'pawprint.fill': 'pets',
  'books.vertical.fill': 'menu-book',
  'compass.fill': 'explore',
  'lock.fill': 'lock',
  'xmark.circle.fill': 'cancel',
  // Add any other icons you need here
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export const IconSymbol: React.FC<{
  name: IconSymbolName;
  size: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}> = ({ name, size, color, style }) => {
  // Ensure size is an integer
  const roundedSize = Math.round(size);
  
  return (
    <MaterialIcons color={color} size={roundedSize} name={MAPPING[name]} style={style} />
  );
};

const styles = StyleSheet.create({});
