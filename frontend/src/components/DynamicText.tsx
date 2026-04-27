import React, { useState, useEffect } from 'react';
import { Text, TextProps } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/apiConfig';
import { getBilingualText, BilingualValue } from '../utils/bilingualHelpers';

const TRANSLATION_CACHE_KEY = '@sevasetu_dynamic_translations';

interface DynamicTextProps extends TextProps {
  text: BilingualValue;
  forceDynamic?: boolean;
  collection?: string;
  docId?: string;
  field?: string;
}

// Global in-memory cache to prevent redundant AsyncStorage reads/writes per component
let globalTranslationCache: Record<string, string> = {};
let isCacheLoaded = false;
let syncTimeout: NodeJS.Timeout | null = null;

const syncCacheToStorage = async (newCache: Record<string, string>) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await AsyncStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(newCache));
    } catch (e) {
      console.warn('[DynamicText] Cache sync failed:', e);
    }
  }, 1000); 
};

export const DynamicText: React.FC<DynamicTextProps> = ({ text: rawValue, forceDynamic, collection, docId, field, style, ...props }) => {
  const { isHindi, language, t } = useLanguage();
  
  // Extract the string value for the current language
  const currentText = getBilingualText(rawValue, language, '');
  const [displayText, setDisplayText] = useState(currentText);

  useEffect(() => {
    let mounted = true;

    // 1. Language Check - If already in English or not Hindi mode, skip
    if (!isHindi) {
      if (mounted) setDisplayText(currentText);
      return;
    }

    // Check if currentText is empty or a placeholder
    if (!currentText || currentText === '—') {
      if (mounted) setDisplayText(currentText);
      return;
    }

    // Check if text is already Hindi (contains Devanagari characters)
    const isAlreadyHindi = /[\u0900-\u097F]/.test(currentText);
    if (isAlreadyHindi) {
      if (mounted) setDisplayText(currentText);
      return;
    }

    // 2. Static Dictionary Check
    const staticTranslation = t(`demo.${currentText}`);
    if (staticTranslation !== `demo.${currentText}`) {
      if (mounted) setDisplayText(staticTranslation);
      return;
    }

    const fallbackTranslation = t(currentText);
    if (fallbackTranslation !== currentText && !forceDynamic) {
      if (mounted) setDisplayText(fallbackTranslation);
      return;
    }

    // 3. Memory Cache Check
    const resolveTranslation = async () => {
      if (!isCacheLoaded) {
        try {
          const cacheRaw = await AsyncStorage.getItem(TRANSLATION_CACHE_KEY);
          if (cacheRaw) {
            globalTranslationCache = { ...globalTranslationCache, ...JSON.parse(cacheRaw) };
          }
          isCacheLoaded = true;
        } catch (e) {
          console.warn('[DynamicText] Failed to load disk cache');
        }
      }

      if (globalTranslationCache[currentText]) {
        if (mounted) setDisplayText(globalTranslationCache[currentText]);
        return;
      }

      // 3. Cache Miss: API fetch
      try {
        if (mounted) setDisplayText(currentText);

        const usePersist = collection && docId && field;
        const endpoint = usePersist ? '/api/ai/translate-and-persist' : '/api/ai/translate';
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: currentText,
            ...(usePersist && { collection, doc_id: docId, field })
          })
        });

        if (response.ok && mounted) {
          const resJson = await response.json();
          const hindiTranslation = resJson.translated_text;

          if (hindiTranslation && hindiTranslation !== currentText) {
            setDisplayText(hindiTranslation);
            
            globalTranslationCache[currentText] = hindiTranslation;
            syncCacheToStorage(globalTranslationCache);
          }
        }
      } catch (err) {
        console.warn('[DynamicText] Translation API failed:', err);
      }
    };

    resolveTranslation();

    return () => {
      mounted = false;
    };
  }, [currentText, isHindi, t, forceDynamic, collection, docId, field]);

  return (
    <Text style={style} {...props}>
      {displayText}
    </Text>
  );
};

