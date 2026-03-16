import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  editable?: boolean;
  onChange?: (n: number) => void;
  size?: number;
}

export default function StarRating({ rating, editable = false, onChange, size = 20 }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((n) => {
        const filled = n <= rating;
        const star = (
          <Ionicons
            key={n}
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? '#FFB300' : '#CCC'}
          />
        );

        if (editable) {
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange?.(n)}
              activeOpacity={0.6}
              style={styles.starButton}
            >
              {star}
            </TouchableOpacity>
          );
        }

        return star;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
});
