import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { LiveTestSubmission } from '../../models';

export const LiveTestResultScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const submission: LiveTestSubmission | undefined = route.params?.submission;

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Test Scorecard" showBack />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[AppStyles.card, styles.hero]}>
          <Ionicons name="trophy" size={54} color={AppColors.goldBorder} />
          <Text style={styles.title}>Test Submitted Successfully!</Text>
          <Text style={styles.score}>
            {submission?.marksObtained ?? 0} / {submission?.totalMarks ?? 0}
          </Text>
          <Text style={styles.percent}>
            {(submission?.percentage ?? 0).toFixed(1)}% Accuracy
          </Text>
        </View>

        <View style={styles.grid}>
          <StatBox label="Correct" value={submission?.correctCount ?? 0} color={AppColors.successGreen} />
          <StatBox label="Wrong" value={submission?.wrongCount ?? 0} color={AppColors.errorRed} />
          <StatBox label="Skipped" value={submission?.skippedCount ?? 0} color={AppColors.textSecondary} />
          <StatBox label="Rank" value={`#${submission?.rank ?? 1}`} color={AppColors.primaryNavy} />
        </View>

        <TouchableOpacity
          style={AppStyles.navyButton}
          onPress={() => navigation.navigate('MainNav')}
        >
          <Text style={AppStyles.primaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <View style={[AppStyles.card, styles.statBox]}>
    <Text style={[styles.statVal, { color }]}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  hero: { padding: 24, alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: AppColors.primaryNavy },
  score: { fontSize: 34, fontWeight: '900', color: AppColors.secondaryMaroon },
  percent: { fontSize: 14, fontWeight: '700', color: AppColors.successGreen },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { width: '48%', padding: 16, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
});
