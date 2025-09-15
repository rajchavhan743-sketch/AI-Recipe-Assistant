import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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

const LANGUAGES = [
  { code: 'English', name: 'English', flag: '🇺🇸' },
  { code: 'Hindi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'Marathi', name: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'Tamil', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'Telugu', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
];

export default function SettingsScreen() {
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from local storage first
      const savedLanguage = await AsyncStorage.getItem('preferredLanguage');
      if (savedLanguage) {
        setPreferredLanguage(savedLanguage);
      }

      // Then try to load from backend
      const response = await fetch(`${BACKEND_URL}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data.preferred_language) {
          setPreferredLanguage(data.preferred_language);
          await AsyncStorage.setItem('preferredLanguage', data.preferred_language);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Continue with local storage value or default
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (language: string) => {
    setIsSaving(true);
    try {
      // Save to local storage immediately
      await AsyncStorage.setItem('preferredLanguage', language);
      setPreferredLanguage(language);

      // Also save to backend
      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferred_language: language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      Alert.alert('Success', `Language preference updated to ${language}`);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Warning', 'Language saved locally but failed to sync with server. Your preference will still be used.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectLanguage = (language: string) => {
    if (language !== preferredLanguage) {
      Alert.alert(
        'Change Language',
        `Change your preferred language to ${language}? This will affect recipe generation and translations.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Change',
            onPress: () => saveSettings(language),
          },
        ]
      );
    }
  };

  const goBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading settings...</Text>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Settings Content */}
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="language" size={18} color="#4CAF50" /> Preferred Language
          </Text>
          <Text style={styles.sectionDescription}>
            Choose your preferred language for recipes and translations
          </Text>

          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                preferredLanguage === language.code && styles.selectedLanguageOption,
              ]}
              onPress={() => selectLanguage(language.code)}
              disabled={isSaving}
            >
              <View style={styles.languageContent}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text
                  style={[
                    styles.languageName,
                    preferredLanguage === language.code && styles.selectedLanguageName,
                  ]}
                >
                  {language.name}
                </Text>
              </View>
              {preferredLanguage === language.code && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              )}
              {isSaving && preferredLanguage === language.code && (
                <ActivityIndicator size="small" color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="information-circle" size={18} color="#4CAF50" /> About
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name</Text>
            <Text style={styles.infoValue}>AI Recipe & Grocery Assistant</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AI Provider</Text>
            <Text style={styles.infoValue}>Google Gemini</Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="help-circle" size={18} color="#4CAF50" /> How to Use
          </Text>
          <View style={styles.helpItem}>
            <Text style={styles.helpStep}>1.</Text>
            <Text style={styles.helpText}>Enter ingredients you have at home</Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpStep}>2.</Text>
            <Text style={styles.helpText}>Tap "Find Recipes" to get AI suggestions</Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpStep}>3.</Text>
            <Text style={styles.helpText}>View recipe details and add missing items to shopping list</Text>
          </View>
          <View style={styles.helpItem}>
            <Text style={styles.helpStep}>4.</Text>
            <Text style={styles.helpText}>Use the translate button to view recipes in your preferred language</Text>
          </View>
        </View>
      </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedLanguageOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectedLanguageName: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  infoLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  infoValue: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  helpStep: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 12,
    width: 20,
  },
  helpText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
    lineHeight: 24,
  },
});