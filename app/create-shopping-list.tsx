import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CreateShoppingListInput, Recipe } from '../src/types';
import { useShoppingLists } from '../src/hooks/useShoppingLists';
import { useRecipes } from '../src/hooks/useRecipes';
import { ShoppingListUtils } from '../src/utils/shoppingListUtils';
import { ScreenErrorBoundary } from '../src/components/common/ErrorBoundary';

const CreateShoppingListScreenComponent: React.FC = () => {
  const router = useRouter();
  const { fromRecipes } = useLocalSearchParams<{ fromRecipes?: string }>();
  const { actions: listActions } = useShoppingLists();
  const { recipes, loading: recipesLoading, actions: recipeActions } = useRecipes();
  
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [creating, setCreating] = useState(false);
  const [showRecipeSelection, setShowRecipeSelection] = useState(false);

  useEffect(() => {
    if (fromRecipes === 'true') {
      setShowRecipeSelection(true);
      recipeActions.loadRecipes();
    }
  }, [fromRecipes]);

  const toggleRecipeSelection = useCallback((recipe: Recipe) => {
    setSelectedRecipes(prev => {
      const isSelected = prev.find(r => r.id === recipe.id);
      if (isSelected) {
        return prev.filter(r => r.id !== recipe.id);
      } else {
        return [...prev, recipe];
      }
    });
  }, []);

  const generateDefaultName = useCallback(() => {
    if (selectedRecipes.length > 0) {
      const recipeNames = selectedRecipes.map(r => r.name);
      return ShoppingListUtils.generateDefaultListName(recipeNames);
    }
    return ShoppingListUtils.generateDefaultListName();
  }, [selectedRecipes]);

  useEffect(() => {
    if (selectedRecipes.length > 0 && !listName) {
      setListName(generateDefaultName());
    }
  }, [selectedRecipes, listName, generateDefaultName]);

  const handleCreate = useCallback(async () => {
    if (!listName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la liste');
      return;
    }

    try {
      setCreating(true);

      if (selectedRecipes.length > 0) {
        // Generate from recipes
        const recipeIds = selectedRecipes.map(r => r.id);
        await listActions.generateFromRecipes(recipeIds, listName.trim());
        Alert.alert('✅', 'Liste générée à partir des recettes !');
      } else {
        // Create empty list
        const input: CreateShoppingListInput = {
          name: listName.trim(),
          description: description.trim() || undefined,
          createdFromRecipes: false,
          items: []
        };
        await listActions.createShoppingList(input);
        Alert.alert('✅', 'Liste créée avec succès !');
      }

      router.back();
    } catch (error) {
      console.error('Error creating shopping list:', error);
      Alert.alert('Erreur', 'Impossible de créer la liste de courses');
    } finally {
      setCreating(false);
    }
  }, [listName, description, selectedRecipes, listActions, router]);

  const renderRecipeSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sélectionner les recettes</Text>
      <Text style={styles.sectionDescription}>
        Choisissez les recettes pour générer automatiquement la liste de courses
      </Text>
      
      {recipesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des recettes...</Text>
        </View>
      ) : (
        <ScrollView style={styles.recipesList} showsVerticalScrollIndicator={false}>
          {recipes.map(recipe => {
            const isSelected = selectedRecipes.find(r => r.id === recipe.id);
            return (
              <TouchableOpacity
                key={recipe.id}
                style={[
                  styles.recipeItem,
                  isSelected && styles.recipeItemSelected
                ]}
                onPress={() => toggleRecipeSelection(recipe)}
              >
                <View style={styles.checkbox}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  {recipe.description && (
                    <Text style={styles.recipeDescription} numberOfLines={2}>
                      {recipe.description}
                    </Text>
                  )}
                  <Text style={styles.ingredientCount}>
                    {recipe.ingredients.length} ingrédients
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      
      {selectedRecipes.length > 0 && (
        <Text style={styles.selectionSummary}>
          {selectedRecipes.length} recette(s) sélectionnée(s)
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nom de la liste *</Text>
            <TextInput
              style={styles.textInput}
              value={listName}
              onChangeText={setListName}
              placeholder="Ma liste de courses"
              maxLength={200}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description (optionnelle)</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description de la liste..."
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {showRecipeSelection && renderRecipeSelection()}

          <View style={styles.toggleSection}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowRecipeSelection(!showRecipeSelection)}
            >
              <Text style={styles.toggleButtonText}>
                {showRecipeSelection ? '📋 Liste manuelle' : '📚 Depuis mes recettes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={creating}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.createButton,
            (!listName.trim() || creating) && styles.createButtonDisabled
          ]}
          onPress={handleCreate}
          disabled={!listName.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>
              {selectedRecipes.length > 0 ? 'Générer' : 'Créer'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function CreateShoppingListPage() {
  return (
    <ScreenErrorBoundary>
      <CreateShoppingListScreenComponent />
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  recipesList: {
    maxHeight: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recipeItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  ingredientCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  selectionSummary: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  createButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});