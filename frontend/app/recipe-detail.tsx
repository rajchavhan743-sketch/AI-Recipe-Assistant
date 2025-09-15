import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
  estimated_time: string;
}

export default function RecipeDetailScreen() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('English');

  useEffect(() => {
    loadRecipe();
    loadSettings();
  }, []);

  const loadRecipe = async () => {
    try {
      const savedRecipe = await AsyncStorage.getItem('selectedRecipe');
      if (savedRecipe) {
        setRecipe(JSON.parse(savedRecipe));
      } else {
        Alert.alert('Error', 'No recipe selected');
        router.back();
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      Alert.alert('Error', 'Failed to load recipe details');
      router.back();
    }
  };

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

  const translateRecipe = async () => {
    if (!recipe || preferredLanguage === 'English') {
      Alert.alert('Info', 'Translation not needed - already in preferred language');
      return;
    }

    setIsTranslating(true);
    try {
      // Prepare text to translate
      const textToTranslate = [
        `Recipe Name: ${recipe.name}`,
        `Description: ${recipe.description}`,
        `Estimated Time: ${recipe.estimated_time}`,
        `Ingredients: ${recipe.ingredients.join(', ')}`,
        `Steps: ${recipe.steps.join('. ')}`,
        `Missing Items: ${recipe.missing_items.join(', ')}`
      ].join('\n\n');

      const response = await fetch(`${BACKEND_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToTranslate,
          target_language: preferredLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translated_text;

      // Show translated text in a modal-like alert
      Alert.alert(
        `Recipe in ${preferredLanguage}`,
        translatedText,
        [
          {
            text: 'Close',
            style: 'default',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Translation error:', error);
      Alert.alert('Error', 'Failed to translate recipe. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const addMissingItemsToShoppingList = async () => {
    if (!recipe || recipe.missing_items.length === 0) {
      Alert.alert('Info', 'No missing items to add to shopping list');
      return;
    }

    setIsAddingToCart(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/shopping-list/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe.missing_items),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      Alert.alert(
        'Success',
        `Added ${recipe.missing_items.length} items to your shopping list!`,
        [
          {
            text: 'View Shopping List',
            onPress: () => router.push('/shopping-list'),
          },
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      Alert.alert('Error', 'Failed to add items to shopping list. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipe Details</Text>
        <TouchableOpacity
          style={styles.translateButton}
          onPress={translateRecipe}
          disabled={isTranslating}
        >
          {isTranslating ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Ionicons name="language" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Recipe Name */}
        <View style={styles.titleSection}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <Text style={styles.recipeDescription}>{recipe.description}</Text>
          <View style={styles.timeContainer}>
            <Ionicons name="time" size={18} color="#4CAF50" />
            <Text style={styles.timeText}>{recipe.estimated_time}</Text>
          </View>
        </View>

        {/* Missing Items Alert */}
        {recipe.missing_items.length > 0 && (
          <View style={styles.missingItemsAlert}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={20} color="#dc3545" />
              <Text style={styles.alertTitle}>Missing Ingredients</Text>
            </View>
            <Text style={styles.alertText}>
              You're missing {recipe.missing_items.length} ingredient(s) for this recipe
            </Text>
            <TouchableOpacity
              style={[styles.addToCartButton, isAddingToCart && styles.buttonDisabled]}
              onPress={addMissingItemsToShoppingList}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="basket-outline" size={16} color="#fff" />
                  <Text style={styles.addToCartText}>Add Missing Items</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="restaurant" size={18} color="#4CAF50" /> Ingredients
          </Text>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text
                style={[
                  styles.listText,
                  recipe.missing_items.includes(ingredient) && styles.missingItem
                ]}
              >
                {ingredient}
                {recipe.missing_items.includes(ingredient) && (
                  <Text style={styles.missingLabel}> (missing)</Text>
                )}
              </Text>
            </View>
          ))}
        </View>

        {/* Steps Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="list" size={18} color="#4CAF50" /> Instructions
          </Text>
          {recipe.steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
  },
  translateButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  recipeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 24,
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  missingItemsAlert: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
  },
  addToCartButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12,
    marginTop: 2,
  },
  listText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    lineHeight: 24,
  },
  missingItem: {
    color: '#dc3545',
  },
  missingLabel: {
    fontStyle: 'italic',
    fontSize: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    lineHeight: 24,
  },
});