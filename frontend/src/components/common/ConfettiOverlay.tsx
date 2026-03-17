import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiOverlayProps {
  play: boolean;
  onAnimationFinish?: () => void;
}

export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({ play, onAnimationFinish }) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (play) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.reset();
    }
  }, [play]);

  if (!play) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <LottieView
        ref={lottieRef}
        source={require('../../../assets/confetti.json')}
        autoPlay
        loop={false}
        onAnimationFinish={onAnimationFinish}
        style={styles.lottie}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    width,
    height,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});
