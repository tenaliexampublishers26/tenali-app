import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { DataSync } from '../../core/utils/dataSync';
import { useMcq } from '../../providers/McqContext';
import { Exam } from '../../models';

export const ExamListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { exams, isLoading, loadExams, selectExam } = useMcq();

  useEffect(() => {
    loadExams();
    return DataSync.subscribe((topic) => {
      if (topic === 'all' || topic === 'exams' || topic === 'mcq') {
        loadExams();
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExams();
    }, [])
  );

  const handleOpenExam = async (exam: Exam) => {
    await selectExam(exam);
    navigation.navigate('ChapterList', { exam });
  };

  if (isLoading && exams.length === 0) {
    return (
      <View style={[AppStyles.screenContainer, styles.center]}>
        <ActivityIndicator size="large" color={AppColors.primaryNavy} />
      </View>
    );
  }

  return (
    <View style={AppStyles.screenContainer}>
      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Select Exam Cadre</Text>
            <Text style={styles.subtitle}>
              Choose your India Post departmental exam to practice chapter-wise MCQs.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[AppStyles.card, styles.card]}
            onPress={() => handleOpenExam(item)}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.examTitle}>{item.title}</Text>
              <Text style={styles.examSub}>{item.subtitle}</Text>
              <Text style={styles.meta}>
                {item.totalChapters} Chapters • {item.totalQuestions} Questions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={AppColors.primaryNavy} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { fontSize: 19, fontWeight: '800', color: AppColors.primaryNavy },
  subtitle: { fontSize: 13, color: AppColors.textSecondary, marginTop: 2 },
  card: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: AppColors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: AppColors.goldGradientEnd, fontSize: 13, fontWeight: '800' },
  examTitle: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  examSub: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, fontWeight: '700', color: AppColors.secondaryMaroon, marginTop: 4 },
});
