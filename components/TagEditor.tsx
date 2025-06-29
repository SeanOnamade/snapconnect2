import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme/colors';

interface TagEditorProps {
  tags: string[];
  onChange: (newTags: string[]) => void;
  placeholder?: string;
}

export default function TagEditor({ tags, onChange, placeholder = "Add tag and press Enter" }: TagEditorProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const newTag = inputValue.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      onChange([...tags, newTag]);
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTextChange = (text: string) => {
    // Handle comma as separator
    if (text.includes(',')) {
      const newTag = text.split(',')[0].trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else {
      // Always show lowercase as user types
      setInputValue(text.toLowerCase());
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={inputValue}
        onChangeText={handleTextChange}
        onSubmitEditing={handleAddTag}
        returnKeyType="done"
      />
      
      {tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.tagChip,
                pressed && styles.tagChipPressed
              ]}
              onPress={() => handleRemoveTag(tag)}
            >
              <Text style={styles.tagText}>#{tag}</Text>
              <Text style={styles.removeIcon}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagChipPressed: {
    backgroundColor: '#00c2c7',
  },
  tagText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  removeIcon: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 