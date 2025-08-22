# Recipe Sharing System Documentation

> 📤 **Complete guide to CookBookP's recipe sharing functionality**

## 🌟 Overview

CookBookP's recipe sharing system provides seamless integration with native device sharing capabilities, allowing users to share recipes via WhatsApp, SMS, Email, and other apps. Built with Expo-compatible libraries for optimal performance and compatibility.

## ✨ Key Features

### 📱 Native Device Integration
- **WhatsApp**: Share recipes directly to conversations
- **SMS/iMessage**: Send recipes via text messaging
- **Email**: Attach recipes to email compositions
- **Social Media**: Share to Twitter, Facebook, etc.
- **File Management**: Save to device file managers

### 📄 Multiple Export Formats
- **PDF**: Professional formatted recipe cards
- **Text**: Simple text format for messaging

### 🔄 Sharing Modes
- **Single Recipe**: Share individual recipes
- **Multiple Recipes**: Share concatenated collections

### 🎯 Smart Features
- **Intelligent File Naming**: Uses recipe names instead of UUIDs
- **Responsive Design**: Centered modal with clean UI
- **Loading States**: Visual feedback during processing
- **Error Handling**: User-friendly error messages

## 🏗️ Architecture

### Core Components

#### ShareModal Component
```typescript
// Location: src/components/recipe/ShareModal.tsx
interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  recipe?: Recipe;        // For single recipe sharing
  recipes?: Recipe[];     // For multiple recipe sharing
  mode?: 'single' | 'multiple';
  title?: string;
}
```

**Features:**
- Centered modal design with fade animation
- Two sharing options: Text and PDF
- Loading states with progress indicators
- Error handling with user feedback
- Touch-friendly interface

#### RecipeExporter Utility
```typescript
// Location: src/utils/recipeExporter.ts
export class RecipeExporter {
  // Single recipe sharing
  static async shareRecipe(recipe: Recipe, format: 'text' | 'pdf'): Promise<void>
  
  // Multiple recipe sharing
  static async shareMultipleRecipes(recipes: Recipe[], format: 'text' | 'pdf'): Promise<void>
  
  // PDF generation
  static async exportToPDF(recipe: Recipe, options?: ExportOptions): Promise<string>
  
  // Text generation  
  static async exportToText(recipe: Recipe, options?: ExportOptions): Promise<string>
}
```

#### useRecipeSharing Hook
```typescript
// Location: src/hooks/useRecipeSharing.ts
const { 
  loading,
  error,
  lastExportPath,
  actions: {
    shareRecipe,
    shareMultipleRecipes,
    exportRecipe,
    exportMultipleRecipes,
    cleanupOldExports,
    initializeExportSystem
  }
} = useRecipeSharing();
```

### Dependencies

#### Expo Libraries
```json
{
  "expo-print": "^14.1.4",    // PDF generation
  "expo-sharing": "^13.1.5",  // Native device sharing
  "expo-file-system": "^18.1.11" // File management
}
```

**Why Expo Libraries?**
- **expo-print**: Generates PDFs within Expo managed workflow
- **expo-sharing**: Accesses native sharing without ejecting
- **expo-file-system**: Handles file operations securely

## 🎨 User Experience

### ShareModal Interface

#### Visual Design
- **Centered Position**: Modal appears in screen center
- **Fade Animation**: Smooth appearance transition
- **Responsive Layout**: Adapts to different screen sizes
- **Clean Styling**: Matches app design language

#### Sharing Options
1. **📱 Partager en texte**
   - Subtitle: "WhatsApp, SMS, Email..."
   - Opens native share dialog with text format
   
2. **📄 Partager en PDF** 
   - Subtitle: "Format imprimable"
   - Generates professional PDF then opens share dialog

#### Loading States
- **Progress Indicator**: Spinning loader during processing
- **Action Text**: Shows current operation ("Création du PDF...")
- **Disabled Interaction**: Prevents multiple simultaneous operations

## 🔧 Implementation Details

### PDF Generation Process

#### Single Recipe PDF
```typescript
// 1. Generate HTML content
const htmlContent = this.generateRecipeHTML(recipe, options);

// 2. Create PDF with expo-print
const { uri } = await Print.printToFileAsync({
  html: htmlContent,
  width: 595, // A4 width
  height: 842, // A4 height
});

// 3. Copy to desired location with proper name
const fileName = `${this.sanitizeFileName(recipe.name)}.pdf`;
const finalPath = `${this.EXPORTS_DIR}${fileName}`;
await FileSystem.copyAsync({ from: uri, to: finalPath });
```

#### Multiple Recipe PDF
```typescript
// 1. Generate concatenated HTML
const htmlContent = this.generateMultipleRecipesHTML(recipes);

// 2. Smart file naming
let fileName = '';
if (recipes.length === 1) {
  fileName = `${this.sanitizeFileName(recipes[0].name)}.pdf`;
} else if (recipes.length === 2) {
  fileName = `${this.sanitizeFileName(recipes[0].name)}_et_${this.sanitizeFileName(recipes[1].name)}.pdf`;
} else {
  fileName = `Collection_${recipes.length}_recettes.pdf`;
}

// 3. Generate and copy PDF
const { uri } = await Print.printToFileAsync({ html: htmlContent });
await FileSystem.copyAsync({ from: uri, to: finalPath });
```

### Native Sharing Process

```typescript
// Check sharing availability
if (!(await Sharing.isAvailableAsync())) {
  throw new Error('Sharing is not available on this platform');
}

// Open native share dialog
await Sharing.shareAsync(filePath, {
  mimeType: format === 'pdf' ? 'application/pdf' : 'text/plain',
  dialogTitle: `Partager la recette: ${recipe.name}`,
  UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.plain-text'
});
```

### File Naming Strategy

#### Single Recipe
- Input: "Tarte aux pommes" → Output: `Tarte_aux_pommes.pdf`
- Sanitization removes special characters and spaces
- Replaces with underscores for file system compatibility

#### Multiple Recipes
- **Two recipes**: `Coq_au_Vin_et_Ratatouille.pdf`
- **Three or more**: `Collection_5_recettes.pdf`
- **Handles French accents**: "Crème brûlée" → `Creme_brulee.pdf`

### HTML Template for PDFs

#### CSS Styling
```css
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  margin: 20px;
  line-height: 1.6;
  color: #333;
}

.recipe-title {
  font-size: 24px;
  color: #667eea;
  margin-bottom: 10px;
}

.ingredient-item {
  background: #f8f9fa;
  margin: 5px 0;
  padding: 8px 12px;
  border-radius: 5px;
  border-left: 3px solid #667eea;
}
```

#### Content Structure
- **Header**: Recipe name and description
- **Meta Information**: Prep time, cook time, servings, difficulty
- **Ingredients**: Organized list with quantities
- **Instructions**: Step-by-step with timing and notes
- **Footer**: Generation date and app branding

## 🚀 Usage Examples

### From Recipe Detail Screen

```typescript
// User taps share button in RecipeDetailScreen
const handleShare = useCallback(() => {
  if (!recipe) return;
  setShareModalVisible(true); // Opens ShareModal in 'single' mode
}, [recipe]);

// ShareModal renders with single recipe
<ShareModal
  visible={shareModalVisible}
  onClose={() => setShareModalVisible(false)}
  recipe={recipe}
  mode="single"
/>
```

### From Recipe List (Bulk Selection)

```typescript
// User selects multiple recipes and taps share
const handleBulkShare = useCallback(() => {
  if (bulkSharing.selectedCount === 0) return;
  setShareModalVisible(true); // Opens ShareModal in 'multiple' mode
}, [bulkSharing.selectedCount]);

// ShareModal renders with recipe array
<ShareModal
  visible={shareModalVisible}
  onClose={() => setShareModalVisible(false)}
  recipes={bulkSharing.selectedRecipes}
  mode="multiple"
/>
```

## 🔐 Security & Performance

### Security Measures
- **Input Sanitization**: All recipe data sanitized before HTML generation
- **File System Safety**: Uses secure temporary directories
- **Permission Handling**: Requests necessary permissions before operations
- **Error Boundaries**: Graceful handling of sharing failures

### Performance Optimizations
- **Lazy Loading**: ShareModal only loads when needed
- **File Cleanup**: Automatic cleanup of temporary files
- **Memory Management**: Efficient HTML generation for large recipe collections
- **Background Processing**: Non-blocking UI during PDF generation

### Error Handling
- **Network Issues**: Handles device connectivity problems
- **Storage Issues**: Manages insufficient storage space
- **Permission Denials**: User-friendly messages for denied permissions
- **Format Failures**: Fallback options for PDF generation issues

## 🧪 Testing Scenarios

### Manual Testing Checklist

#### Single Recipe Sharing
- [ ] Open recipe detail screen
- [ ] Tap share button (📤)
- [ ] Verify ShareModal appears centered
- [ ] Test "Partager en texte" option
- [ ] Test "Partager en PDF" option
- [ ] Verify native share dialog opens
- [ ] Confirm file has proper recipe name

#### Multiple Recipe Sharing
- [ ] Navigate to recipe list
- [ ] Tap "Sélectionner" to enter selection mode
- [ ] Select 2-3 recipes
- [ ] Tap "📤 Partager" button
- [ ] Test both sharing options
- [ ] Verify concatenated content
- [ ] Check proper file naming for collections

#### Error Scenarios
- [ ] Test sharing with no network connection
- [ ] Test sharing with insufficient storage
- [ ] Test sharing with permissions denied
- [ ] Verify error messages are user-friendly

### Integration Testing
- [ ] Test with different devices (iOS, Android)
- [ ] Verify compatibility with various sharing apps
- [ ] Test PDF rendering on different screen sizes
- [ ] Confirm file formats are properly recognized

## 🔄 Future Enhancements

### Planned Features
- **QR Code Sharing**: Generate QR codes for recipe sharing
- **Recipe Collections**: Save and share custom recipe collections
- **Print Integration**: Direct printing support
- **Cloud Sharing**: Integration with cloud storage services

### Potential Improvements
- **Batch Processing**: Optimize multiple recipe processing
- **Template Customization**: Allow users to choose PDF themes
- **Social Integration**: Direct sharing to specific social platforms
- **Analytics**: Track most shared recipes and formats

## 📚 Troubleshooting

### Common Issues

#### "Sharing is not available"
- **Cause**: Device doesn't support native sharing
- **Solution**: Check device compatibility and app permissions

#### PDF Generation Fails
- **Cause**: Insufficient memory or storage
- **Solution**: Free up device storage, restart app

#### Files Not Properly Named
- **Cause**: Special characters in recipe names
- **Solution**: File naming sanitization should handle this automatically

### Debug Information

#### Logs Location
```typescript
// Enable debug logging
SecureErrorHandler.logError(error, {
  action: 'shareRecipe',
  recipeId: recipe.id,
  format: format
});
```

#### File Locations
- **Temporary PDFs**: `${FileSystem.documentDirectory}recipe-exports/`
- **Shared Files**: Device-dependent (handled by expo-sharing)

---

*Generated by Claude Code on December 22, 2024*
*Version: CookBookP v1.0 Recipe Sharing System*