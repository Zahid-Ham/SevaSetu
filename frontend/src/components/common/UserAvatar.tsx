import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography } from '../../theme';

interface UserAvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  style?: ViewStyle;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  imageUrl,
  size = 48,
  style,
}) => {
  const getInitials = (nameStr: string) => {
    if (!nameStr) return '??';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={[styles.image, containerStyle]} />
      ) : (
        <Text style={[typography.headingMedium, styles.initials, { fontSize: size * 0.4 }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: colors.cardBackground,
  },
});
