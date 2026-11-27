import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { useLiveTest } from '../../providers/LiveTestContext';
import { useAuth } from '../../providers/AuthContext';
import { getOptionText } from '../../models';

export const LiveTestRunnerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const {
    currentTest,
    questions,
    currentIndex,
    currentQuestion,
    selectedAnswers,
    formattedTimeRemaining,
    selectOption,
    clearOption,
    nextQuestion,
    previousQuestion,
    submitTest,
  } = useLiveTest();

  const handleSubmit = () => {
    Alert.alert(
      'Submit Live Test?',
      `You have answered ${Object.keys(selectedAnswers).length} of ${questions.length} questions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            const sub = await submitTest(
              user?.fullName || 'Candidate',
              user?.phoneNumber || '0000000000'
            );
            if (sub) {
              navigation.replace('LiveTestResult', { submission: sub });
            }
          },
        },
      ]
    );
  };

  if (!currentQuestion) {
    return (
      <View style={AppStyles.screenContainer}>
        <TenaliTopAppBar title={currentTest?.title || 'Live Test'} showBack />
        <View style={styles.center}>
          <Text style={styles.emptyText}>No questions loaded for this test.</Text>
        </View>
      </View>
    );
  }

  const options = ['A', 'B', 'C', 'D'] as const;
  const chosen = selectedAnswers[currentQuestion.id];

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar
        title={currentTest?.title || 'Live Test'}
        showBack
        rightAction={
          <View style={styles.timerPill}>
            <Text style={styles.timerText}>{formattedTimeRemaining}</Text>
          </View>
        }
      />

      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          Q{currentIndex + 1} / {questions.length}
        </Text>
        <TouchableOpacity onPress={handleSubmit} style={styles.submitMini}>
          <Text style={styles.submitMiniText}>Submit Test</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[AppStyles.card, styles.qCard]}>
          <Text style={styles.qText}>{currentQuestion.questionText}</Text>
        </View>

        <View style={{ gap: 10 }}>
          {options.map((opt) => {
            const isSelected = chosen === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.optionCard,
                  isSelected && {
                    borderColor: AppColors.primaryNavy,
                    backgroundColor: '#EFF6FF',
                  },
                ]}
                onPress={() => selectOption(currentQuestion.id, opt)}
              >
                <View style={[styles.optBadge, isSelected && { backgroundColor: AppColors.primaryNavy }]}>
                  <Text style={[styles.optBadgeText, isSelected && { color: '#fff' }]}>
                    {opt}
                  </Text>
                </View>
                <Text style={styles.optText}>{getOptionText(currentQuestion, opt)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {chosen && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => clearOption(currentQuestion.id)}
          >
            <Text style={styles.clearText}>Clear Response</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity
          style={[AppStyles.outlinedButton, { flex: 1 }, currentIndex === 0 && { opacity: 0.4 }]}
          onPress={previousQuestion}
          disabled={currentIndex === 0}
        >
          <Text style={AppStyles.outlinedButtonText}>← Previous</Text>
        </TouchableOpacity>
        {currentIndex < questions.length - 1 ? (
          <TouchableOpacity style={[AppStyles.navyButton, { flex: 1 }]} onPress={nextQuestion}>
            <Text style={AppStyles.primaryButtonText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[AppStyles.primaryButton, { flex: 1 }]} onPress={handleSubmit}>
            <Text style={AppStyles.primaryButtonText}>Submit Test</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: AppColors.textMuted },
  timerPill: {
    backgroundColor: AppColors.secondaryMaroon,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timerText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.surfaceWarmWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  progressText: { fontSize: 13, fontWeight: '800', color: AppColors.primaryNavy },
  submitMini: {
    backgroundColor: AppColors.successGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  submitMiniText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scroll: { padding: 16, gap: 14 },
  qCard: { padding: 16 },
  qText: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, lineHeight: 23 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: AppColors.borderSubtle,
    backgroundColor: AppColors.surfaceWhite,
  },
  optBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppColors.surfaceCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optBadgeText: { fontSize: 13, fontWeight: '800', color: AppColors.primaryNavy },
  optText: { flex: 1, fontSize: 14, fontWeight: '600', color: AppColors.textPrimary },
  clearBtn: { alignSelf: 'flex-end', padding: 6 },
  clearText: { fontSize: 12, fontWeight: '700', color: AppColors.secondaryMaroon },
  navBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: AppColors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
  },
});
