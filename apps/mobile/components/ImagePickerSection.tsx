import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

interface ImagePickerSectionProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImagePickerSection({ images, onChange, maxImages = 5 }: ImagePickerSectionProps) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert('', `Maximum ${maxImages} images allowed`);
      return;
    }

    // Request permission
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('', 'Camera roll permission is needed to add photos');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: maxImages - images.length,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const asset of result.assets) {
        if (!asset.base64) continue;
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        const { url } = await api.uploadImage(base64Uri);
        newUrls.push(url);
      }
      onChange([...images, ...newUrls].slice(0, maxImages));
    } catch (error: any) {
      Alert.alert('Upload failed', error.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    if (images.length >= maxImages) {
      Alert.alert('', `Maximum ${maxImages} images allowed`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'Camera permission is needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    setUploading(true);
    try {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const { url } = await api.uploadImage(base64Uri);
      onChange([...images, url].slice(0, maxImages));
    } catch (error: any) {
      Alert.alert('Upload failed', error.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {/* Image preview grid */}
      <View style={styles.grid}>
        {images.map((uri, index) => (
          <View key={uri} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeImage(index)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={22} color="#E53935" />
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverText}>Cover</Text>
              </View>
            )}
          </View>
        ))}

        {/* Add button */}
        {images.length < maxImages && !uploading && (
          <TouchableOpacity style={styles.addBtn} onPress={pickImage} onLongPress={takePhoto}>
            <Ionicons name="camera-outline" size={28} color="#888" />
            <Text style={styles.addText}>Add Photo</Text>
            <Text style={styles.addHint}>{images.length}/{maxImages}</Text>
          </TouchableOpacity>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <View style={styles.addBtn}>
            <ActivityIndicator size="small" color="#2E7D32" />
            <Text style={styles.addText}>Uploading...</Text>
          </View>
        )}
      </View>

      {images.length === 0 && !uploading && (
        <Text style={styles.hint}>Tap to choose from gallery, hold to take a photo</Text>
      )}
    </View>
  );
}

const IMAGE_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  addBtn: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  addText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  addHint: {
    fontSize: 10,
    color: '#bbb',
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
});
