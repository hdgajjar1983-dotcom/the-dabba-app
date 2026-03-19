import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { 
  Defs, 
  LinearGradient, 
  Stop, 
  Circle, 
  Ellipse, 
  Rect, 
  Path, 
  Text as SvgText 
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

// Royal Gujarati Colors
export const BRAND_COLORS = {
  maroon: '#8B1538',
  maroonDark: '#5D0E24',
  gold: '#D4AF37',
  goldLight: '#F4E4BA',
  goldDark: '#C5A028',
  brass: '#CD853F',
  brassGold: '#B8860B',
  brassDark: '#8B6914',
  cream: '#FDF8F3',
  saffron: '#FF9933',
};

export default function DabbaLogo({ size = 120, showText = false }: LogoProps) {
  const scale = size / 200;
  
  return (
    <View style={[styles.container, { width: size, height: showText ? size * 1.15 : size }]}>
      <Svg width={size} height={showText ? size * 1.15 : size} viewBox={showText ? "0 0 200 230" : "0 0 200 200"}>
        <Defs>
          <LinearGradient id="royalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={BRAND_COLORS.maroon} stopOpacity="1" />
            <Stop offset="100%" stopColor={BRAND_COLORS.maroonDark} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={BRAND_COLORS.gold} stopOpacity="1" />
            <Stop offset="50%" stopColor={BRAND_COLORS.goldLight} stopOpacity="1" />
            <Stop offset="100%" stopColor={BRAND_COLORS.goldDark} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="dabbaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={BRAND_COLORS.brass} stopOpacity="1" />
            <Stop offset="50%" stopColor={BRAND_COLORS.brassGold} stopOpacity="1" />
            <Stop offset="100%" stopColor={BRAND_COLORS.brassDark} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Outer decorative ring */}
        <Circle cx="100" cy="100" r="98" fill="none" stroke="url(#goldGrad)" strokeWidth="3"/>
        <Circle cx="100" cy="100" r="92" fill="none" stroke="url(#goldGrad)" strokeWidth="1"/>
        
        {/* Main background */}
        <Circle cx="100" cy="100" r="88" fill="url(#royalGrad)"/>
        
        {/* Traditional Dabba/Tiffin Box */}
        {/* Base container */}
        <Ellipse cx="100" cy="130" rx="45" ry="12" fill="url(#dabbaGrad)"/>
        <Rect x="55" y="90" width="90" height="40" rx="5" fill="url(#dabbaGrad)"/>
        <Ellipse cx="100" cy="90" rx="45" ry="12" fill="#DEB887"/>
        
        {/* Lid */}
        <Ellipse cx="100" cy="75" rx="40" ry="10" fill="url(#goldGrad)"/>
        <Ellipse cx="100" cy="72" rx="35" ry="8" fill={BRAND_COLORS.goldLight}/>
        
        {/* Handle */}
        <Path d="M85 65 Q100 45 115 65" fill="none" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Steam wisps */}
        <Path d="M80 55 Q78 45 82 38" fill="none" stroke={BRAND_COLORS.goldLight} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
        <Path d="M100 50 Q98 40 102 32" fill="none" stroke={BRAND_COLORS.goldLight} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
        <Path d="M120 55 Q122 45 118 38" fill="none" stroke={BRAND_COLORS.goldLight} strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
        
        {/* Decorative dots */}
        <Circle cx="70" cy="110" r="3" fill={BRAND_COLORS.goldLight} opacity="0.6"/>
        <Circle cx="100" cy="115" r="3" fill={BRAND_COLORS.goldLight} opacity="0.6"/>
        <Circle cx="130" cy="110" r="3" fill={BRAND_COLORS.goldLight} opacity="0.6"/>
        
        {/* Traditional pattern border */}
        <Circle cx="100" cy="100" r="85" fill="none" stroke={BRAND_COLORS.gold} strokeWidth="1" strokeDasharray="4,4" opacity="0.5"/>
        
        {/* Text */}
        {showText && (
          <SvgText 
            x="100" 
            y="215" 
            textAnchor="middle" 
            fill={BRAND_COLORS.goldLight} 
            fontFamily="Georgia" 
            fontSize="14" 
            fontWeight="bold"
            letterSpacing="3"
          >
            THE DABBA
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
