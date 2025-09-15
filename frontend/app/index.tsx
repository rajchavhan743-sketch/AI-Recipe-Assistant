import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Recipe {
  name: string;
  description: string;
  ingredients: string[];
  steps: string[];
  missing_items: string[];
}

export default function HomeScreen() {
  const [ingredients, setIngredients] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('English');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('preferredLanguage');
      if (savedLanguage) {
        setPreferredLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      Speech.stop();
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(true);
      
      // For now, we'll use a simple prompt-based approach
      // In a real implementation, you would use expo-speech-recognition
      Alert.alert(
        'Voice Input',
        'Please speak your ingredients now. This is a demo - tap OK to use text input.',
        [
          {
            text: 'Cancel',
            onPress: () => setIsRecording(false),
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: () => {
              setIsRecording(false);
              // Demo: Set some sample ingredients
              setIngredients('rice, tomatoes, onions, chicken');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Voice input error:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Voice input is not available on this device');
    }
  };

  const findRecipes = async () => {
    if (!ingredients.trim()) {
      Alert.alert('Error', 'Please enter some ingredients first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: ingredients.trim(),
          language: preferredLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecipes(data.recipes || []);
      
      if (data.recipes && data.recipes.length > 0) {
        Alert.alert('Success', `Found ${data.recipes.length} recipe suggestions!`);
      } else {
        Alert.alert('No Recipes', 'No recipes found for the given ingredients. Try different ingredients.');
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      Alert.alert('Error', 'Failed to fetch recipes. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectRecipe = async (recipe: Recipe) => {
    try {
      // Save selected recipe to AsyncStorage for the detail screen
      await AsyncStorage.setItem('selectedRecipe', JSON.stringify(recipe));
      router.push('/recipe-detail');
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to open recipe details');
    }
  };

  const navigateToShoppingList = () => {
    router.push('/shopping-list');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.recipeItem}
      onPress={() => selectRecipe(item)}
      activeOpacity={0.7}
    >
      <View style={styles.recipeContent}>
        <Text style={styles.recipeName}>{item.name}</Text>
        <Text style={styles.recipeDescription}>{item.description}</Text>
        <View style={styles.recipeStats}>
          <Text style={styles.statText}>
            <Ionicons name="restaurant" size={14} color="#666" /> {item.ingredients.length} ingredients
          </Text>
          <Text style={styles.statText}>
            <Ionicons name="time" size={14} color="#666" /> {item.steps.length} steps
          </Text>
        </View>
        {item.missing_items.length > 0 && (
          <Text style={styles.missingItems}>
            Missing: {item.missing_items.slice(0, 3).join(', ')}
            {item.missing_items.length > 3 && '...'}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>What's in your kitchen?</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={navigateToSettings}
        >
          <Ionicons name="settings-outline" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Enter your available ingredients:</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., rice, tomatoes, chicken, onions..."
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonActive]}
              onPress={handleVoiceInput}
              disabled={isLoading}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={20}
                color={isRecording ? "#fff" : "#4CAF50"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.findButton, isLoading && styles.buttonDisabled]}
            onPress={findRecipes}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.findButtonText}>Find Recipes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shoppingButton}
            onPress={navigateToShoppingList}
          >
            <Ionicons name="basket-outline" size={20} color="#FFC107" />
            <Text style={styles.shoppingButtonText}>Shopping List</Text>
          </TouchableOpacity>
        </View>

        {/* Recipes List */}
        {recipes.length > 0 && (
          <View style={styles.recipesSection}>
            <Text style={styles.sectionTitle}>Recipe Suggestions</Text>
            <FlatList
              data={recipes}
              renderItem={renderRecipeItem}
              keyExtractor={(item, index) => `recipe-${index}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    paddingRight: 60,
    fontSize: 16,
    color: '#2c3e50',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  micButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#4CAF50',
  },
  actionButtons: {
    marginBottom: 20,
  },
  findButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  shoppingButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FFC107',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shoppingButtonText: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  recipesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  recipeItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  recipeContent: {
    flex: 1,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  recipeStats: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginRight: 16,
  },
  missingItems: {
    fontSize: 12,
    color: '#dc3545',
    fontStyle: 'italic',
  },
});