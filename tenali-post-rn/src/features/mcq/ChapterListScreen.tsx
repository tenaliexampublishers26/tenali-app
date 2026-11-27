import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { AppConstants } from '../../core/constants';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { useMcq } from '../../providers/McqContext';
import { Chapter, Exam } from '../../models';

export const ChapterListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const exam: Exam | undefined = route.params?.exam;
  const { chapters, isLoading, selectChapterAndLanguage } = useMcq();
  const [selectedLang, setSelectedLang] = useState<'en' | 'te' | 'hi'>('en');

  const handleOpenChapter = async (chapter: Chapter) => {
    await selectChapterAndLanguage(chapter, selectedLang);
    navigation.navigate('McqPractice', { chapter });
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title={exam?.title || 'Chapters'} showBack />

      <View style={styles.langBar}>
        <Text style={styles.langLabel}>Medium:</Text>
        {AppConstants.languages.map((lang) => {
          const active = selectedLang === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langChip, active && styles.langChipActive]}
              onPress={() => setSelectedLang(lang.code)}
            >
              <Text style={[styles.langText, active && styles.langTextActive]}>
                {lang.nativeName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primaryNavy} />
        </View>
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No chapters available for this exam yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[AppStyles.card, styles.card]}
              onPress={() => handleOpenChapter(item)}
            >
              <View style={styles.numBox}>
                <Text style={styles.numText}>CH {item.chapterNumber}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                {!!item.description && (
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <Text style={styles.meta}>{item.totalQuestions} Practice Questions</Text>
              </View>
              <Ionicons name="play-circle" size={26} color={AppColors.secondaryMaroon} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.surfaceWarmWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  langLabel: { fontSize: 13, fontWeight: '700', color: AppColors.primaryNavy },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceCream,
    borderWidth: 1,
    borderColor: AppColors.borderSubtle,
  },
  langChipActive: {
    backgroundColor: AppColors.primaryNavy,
    borderColor: AppColors.primaryNavy,
  },
  langText: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
  langTextActive: { color: AppColors.surfaceWhite },
  list: { padding: 16, gap: 12 },
  card: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  numBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: AppColors.goldGradientStart,
    borderWidth: 1,
    borderColor: AppColors.goldBorder,
  },
  numText: { fontSize: 12, fontWeight: '800', color: AppColors.primaryNavy },
  title: { fontSize: 14, fontWeight: '800', color: AppColors.primaryNavy },
  desc: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '700', color: AppColors.successGreen, marginTop: 4 },
  emptyText: { fontSize: 14, color: AppColors.textMuted },
});
