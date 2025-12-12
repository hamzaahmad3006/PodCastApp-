import { StyleSheet, View } from 'react-native';

const StripeBackground = () => {
  const stripes = Array.from({ length: 80 });

  return (
    <View style={styles.stripeContainer}>
      {stripes.map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            { transform: [{ rotate: '-45deg' }], left: i * 20 - 300 }, 
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stripeContainer: {
    ...StyleSheet.absoluteFillObject, 
    flexDirection: 'row',
    overflow: 'hidden',
  },

  stripe: {
    width: 8,
    height: '300%', 
    backgroundColor: 'rgba(255,255,255,0.08)',
    position: 'absolute',
    top: -100, 
  },
});

export default StripeBackground;
