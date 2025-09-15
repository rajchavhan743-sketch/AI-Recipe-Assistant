import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

interface ShoppingItem {
  id: string;
  name: string;
  added_at: string;
}

export default function ShoppingListScreen() {
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/shopping-list`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Loaded shopping list items:', data.length);
      setShoppingItems(data || []);
    } catch (error) {
      console.error('Error loading shopping list:', error);
      Alert.alert('Error', 'Failed to load shopping list. Please check your internet connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadShoppingList();
  };

  const clearShoppingList = () => {
    Alert.alert(
      'Clear Shopping List',
      'Are you sure you want to clear all items from your shopping list?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: performClearAll,
        },
      ]
    );
  };

  const performClearAll = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/shopping-list`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clear local state immediately
      setShoppingItems([]);
      
      // Also refresh from server to ensure consistency
      await loadShoppingList();
      
      Alert.alert('Success', 'Shopping list cleared successfully!');
    } catch (error) {
      console.error('Error clearing shopping list:', error);
      Alert.alert('Error', 'Failed to clear shopping list. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const deleteItem = (item: ShoppingItem) => {
    Alert.alert(
      'Delete Item',
      `Remove "${item.name}" from your shopping list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDeleteItem(item.id),
        },
      ]
    );
  };

  const performDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/shopping-list/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state immediately
      setShoppingItems(prev => prev.filter(item => item.id !== itemId));
      
      // Also refresh from server to ensure consistency
      await loadShoppingList();
      
      Alert.alert('Success', 'Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item. Please try again.');
    }
  };

  const goBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteItem(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#dc3545" />
          </TouchableOpacity>
        </View>
        <Text style={styles.itemDate}>Added: {formatDate(item.added_at)}</Text>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="basket-outline" size={64} color="#e9ecef" />
      <Text style={styles.emptyTitle}>Your shopping list is empty</Text>
      <Text style={styles.emptyText}>
        Add missing ingredients from recipes to build your shopping list
      </Text>
      <TouchableOpacity
        style={styles.backToRecipesButton}
        onPress={goBack}
      >
        <Text style={styles.backToRecipesText}>Find Recipes</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading shopping list...</Text>
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
        <Text style={styles.headerTitle}>Shopping List</Text>
        {shoppingItems.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearShoppingList}
            disabled={isClearing}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color="#dc3545" />
            ) : (
              <Ionicons name="trash" size={20} color="#dc3545" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Shopping List */}
      <View style={styles.content}>
        {shoppingItems.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {shoppingItems.length} item{shoppingItems.length !== 1 ? 's' : ''} in your list
            </Text>
          </View>
        )}

        <FlatList
          data={shoppingItems}
          renderItem={renderShoppingItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#4CAF50']}
              tintColor="#4CAF50"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={shoppingItems.length === 0 ? styles.emptyListContainer : undefined}
        />
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
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    paddingVertical: 16,
  },
  statsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemContent: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backToRecipesButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  backToRecipesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});