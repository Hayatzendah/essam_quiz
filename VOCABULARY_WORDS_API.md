# Vocabulary Words API - Meanings Support

## Overview

Vocabulary Words API now supports two formats for word meanings:

1. **Legacy format**: `meaning` as a string (separated by `/`)
2. **New format**: `meanings` as an array of objects with `text` and `language`

Both formats are supported for backward compatibility. The API automatically converts `meaning` string to `meanings` array when needed.

## Endpoints

### 1. Create Single Word

**POST** `/vocabulary-words`

#### Legacy Format (meaning as string):
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "word": "das Haus / die Häuser",
  "meaning": "بيت / house / maison",
  "exampleSentence": "Das Haus ist neu."
}
```

#### New Format (meanings as array):
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "word": "das Haus / die Häuser",
  "meanings": [
    { "text": "بيت", "language": "ar" },
    { "text": "house", "language": "en" },
    { "text": "maison", "language": "fr" }
  ],
  "exampleSentence": "Das Haus ist neu."
}
```

### 2. Create Bulk Words

**POST** `/vocabulary-words/bulk`

#### Request Body:
```json
{
  "topicId": "507f1f77bcf86cd799439011",
  "words": [
    {
      "word": "das Haus / die Häuser",
      "meanings": [
        { "text": "بيت", "language": "ar" },
        { "text": "house", "language": "en" },
        { "text": "maison", "language": "fr" }
      ],
      "exampleSentence": "Das Haus ist neu."
    },
    {
      "word": "der Tisch",
      "meaning": "طاولة / table",
      "exampleSentence": "Der Tisch ist groß."
    }
  ]
}
```

**Note**: You can mix both formats in the same bulk request.

## Schema

### VocabularyWord Schema

```typescript
{
  topicId: ObjectId,
  word: string,
  meaning?: string,        // Legacy format (optional)
  meanings?: Array<{       // New format (optional)
    text: string,
    language: string       // Language code: 'ar', 'en', 'fr', 'de', etc.
  }>,
  exampleSentence?: string,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Language Codes

Supported language codes:
- `ar` - Arabic (العربية)
- `en` - English
- `fr` - French (Français)
- `de` - German (Deutsch)
- `es` - Spanish (Español)
- `it` - Italian (Italiano)
- `pt` - Portuguese (Português)
- `ru` - Russian (Русский)
- `tr` - Turkish (Türkçe)
- `unknown` - Unknown/Other

## Automatic Conversion

When you provide `meaning` as a string, the API automatically converts it to `meanings` array:

**Input:**
```json
{
  "meaning": "بيت / house / maison"
}
```

**Stored as:**
```json
{
  "meaning": "بيت / house / maison",
  "meanings": [
    { "text": "بيت", "language": "ar" },
    { "text": "house", "language": "en" },
    { "text": "maison", "language": "fr" }
  ]
}
```

## Migration

To migrate existing data from `meaning` string to `meanings` array, run:

```bash
npm run migrate-vocabulary-meanings
```

This script will:
1. Find all words with `meaning` string but no `meanings` array
2. Convert `meaning` string to `meanings` array
3. Keep the original `meaning` field for backward compatibility

## Validation Rules

- Either `meaning` or `meanings` must be provided (at least one)
- If `meanings` is provided, it must be a non-empty array
- Each meaning object must have `text` (string) and `language` (string)
- `text` cannot be empty
- `language` cannot be empty

## Examples

### Example 1: Single meaning (Arabic)
```json
{
  "word": "Hallo",
  "meanings": [
    { "text": "مرحبا", "language": "ar" }
  ]
}
```

### Example 2: Multiple meanings
```json
{
  "word": "Guten Tag",
  "meanings": [
    { "text": "يوم سعيد", "language": "ar" },
    { "text": "Good day", "language": "en" },
    { "text": "Bonjour", "language": "fr" }
  ]
}
```

### Example 3: Using legacy format
```json
{
  "word": "Auf Wiedersehen",
  "meaning": "مع السلامة / Goodbye / Au revoir"
}
```

## Response Format

When retrieving words, both `meaning` and `meanings` are returned:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "topicId": "507f1f77bcf86cd799439012",
  "word": "das Haus",
  "meaning": "بيت / house / maison",
  "meanings": [
    { "text": "بيت", "language": "ar" },
    { "text": "house", "language": "en" },
    { "text": "maison", "language": "fr" }
  ],
  "exampleSentence": "Das Haus ist neu.",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```
