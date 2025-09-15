import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
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
      try {
        const response = await fetch(`${BACKEND_URL}/api/settings`);
        if (response.ok) {
          const data = await response.json();
          if (data.preferred_language) {
            setPreferredLanguage(data.preferred_language);
            // Update local storage if different
            if (data.preferred_language !== savedLanguage) {
              await AsyncStorage.setItem('preferredLanguage', data.preferred_language);
            }
          }
        }
      } catch (error) {
        console.log('Backend settings not available, using local storage');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (language: string) => {
    setIsSaving(true);
    try {
      // Save to local storage immediately for instant UI update
      await AsyncStorage.setItem('preferredLanguage', language);
      setPreferredLanguage(language);

      // Also save to backend
      try {
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

        Alert.alert('Success', `Language changed to ${language}!\nNew recipes will be generated in this language.`);
      } catch (error) {
        console.error('Error saving to backend:', error);
        Alert.alert(
          'Partially Saved', 
          `Language changed to ${language} locally. Settings will sync when connection is restored.`
        );
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save language preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectLanguage = (language: string) => {
    if (language !== preferredLanguage && !isSaving) {
      Alert.alert(
        'Change Language',
        `Change your preferred language to ${language}?\n\nThis will affect:
• Recipe generation language
• Translation services
• All new content`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Change Language',
            onPress: () => saveSettings(language),
            style: 'default',
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Language Display */}
        <View style={styles.currentLanguageSection}>
          <Text style={styles.currentLanguageTitle}>Current Language</Text>
          <View style={styles.currentLanguageDisplay}>
            <Text style={styles.currentLanguageFlag}>
              {LANGUAGES.find(lang => lang.code === preferredLanguage)?.flag || '🌐'}
            </Text>
            <Text style={styles.currentLanguageName}>{preferredLanguage}</Text>
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="language" size={18} color="#4CAF50" /> Choose Language
          </Text>
          <Text style={styles.sectionDescription}>
            Select your preferred language for recipes and translations
          </Text>

          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                preferredLanguage === language.code && styles.selectedLanguageOption,
                isSaving && styles.languageOptionDisabled,
              ]}
              onPress={() => selectLanguage(language.code)}
              disabled={isSaving}
              activeOpacity={0.7}
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
              <View style={styles.languageActions}>
                {isSaving && preferredLanguage === language.code ? (
                  <ActivityIndicator size="small" color="#4CAF50" />
                ) : preferredLanguage === language.code ? (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={styles.selectedText}>Selected</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                )}
              </View>
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
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Languages Supported</Text>
            <Text style={styles.infoValue}>{LANGUAGES.length} Languages</Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="sparkles" size={18} color="#4CAF50" /> Features
          </Text>
          <View style={styles.featureItem}>
            <Ionicons name="mic" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Voice input for ingredients</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="restaurant" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>4-5 AI-generated recipes per search</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="time" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Estimated cooking times</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="basket" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Smart shopping list management</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="language" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Multi-language recipe translation</Text>
          </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  currentLanguageSection: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    alignItems: 'center',
  },
  currentLanguageTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    opacity: 0.9,
  },
  currentLanguageDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLanguageFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  currentLanguageName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
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
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  selectedLanguageOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  languageOptionDisabled: {
    opacity: 0.6,
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
  languageActions: {
    alignItems: 'center',
  },
  selectedIndicator: {
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
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
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
});