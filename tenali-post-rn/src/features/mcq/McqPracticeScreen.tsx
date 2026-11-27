import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { useMcq } from '../../providers/McqContext';
import { getOptionText } from '../../models';

export const McqPracticeScreen: React.FC = () => {
  const {
    questions,
    currentIndex,
    currentQuestion,
    selectedChapter,
    selectedOptionForCurrent,
    isCurrentLocked,
    correctAnswersCount,
    wrongAnswersCount,
    isLoading,
    chooseOption,
    nextQuestion,
    previousQuestion,
    resetPractice,
  } = useMcq();

  if (isLoading) {
    return (
      <View style={AppStyles.screenContainer}>
        <TenaliTopAppBar title="MCQ Practice" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.primaryNavy} />
        </View>
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={AppStyles.screenContainer}>
        <TenaliTopAppBar title={selectedChapter?.title || 'MCQ Practice'} showBack />
        <View style={styles.center}>
          <Ionicons name="help-circle-outline" size={52} color={AppColors.textMuted} />
          <Text style={styles.emptyTitle}>No Questions Found</Text>
          <Text style={styles.emptySub}>
            Try switching language or ask the administrator to publish questions for this chapter.
          </Text>
        </View>
      </View>
    );
  }

  const options = ['A', 'B', 'C', 'D'] as const;
  const correctKey = (currentQuestion.correctOption || '').toUpperCase();

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar
        title={selectedChapter?.title || 'MCQ Practice'}
        showBack
        rightAction={
          <TouchableOpacity onPress={resetPractice} style={styles.resetBtn}>
            <Ionicons name="refresh" size={18} color={AppColors.primaryNavy} />
          </TouchableOpacity>
        }
      />

      <View style={styles.statsBar}>
        <Text style={styles.progressText}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreChip, { color: AppColors.successGreen }]}>
            ✓ {correctAnswersCount}
          </Text>
          <Text style={[styles.scoreChip, { color: AppColors.errorRed }]}>
            ✕ {wrongAnswersCount}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[AppStyles.card, styles.qCard]}>
          <View style={styles.qMetaRow}>
            <Text style={styles.qNumber}>Q{currentIndex + 1}</Text>
            <Text style={styles.qDiff}>{currentQuestion.difficulty}</Text>
          </View>
          <Text style={styles.qText}>{currentQuestion.questionText}</Text>
        </View>

        <View style={{ gap: 10 }}>
          {options.map((opt) => {
            const text = getOptionText(currentQuestion, opt);
            const isSelected = selectedOptionForCurrent === opt;
            const isCorrect = correctKey === opt;

            let bg: string = AppColors.surfaceWhite;
            let border: string = AppColors.borderSubtle;
            if (isCurrentLocked) {
              if (isCorrect) {
                bg = AppColors.successGreenBg;
                border = AppColors.successGreen;
              } else if (isSelected) {
                bg = AppColors.errorRedBg;
                border = AppColors.errorRed;
              }
            } else if (isSelected) {
              border = AppColors.primaryNavy;
            }

            return (
              <TouchableOpacity
                key={opt}
                style={[styles.optionCard, { backgroundColor: bg, borderColor: border }]}
                onPress={() => chooseOption(opt)}
                disabled={isCurrentLocked}
              >
                <View
                  style={[
                    styles.optBadge,
                    isCurrentLocked && isCorrect && { backgroundColor: AppColors.successGreen },
                    isCurrentLocked && isSelected && !isCorrect && { backgroundColor: AppColors.errorRed },
                  ]}
                >
                  <Text
                    style={[
                      styles.optBadgeText,
                      isCurrentLocked && (isCorrect || isSelected) && { color: '#fff' },
                    ]}
                  >
                    {opt}
                  </Text>
                </View>
                <Text style={styles.optText}>{text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isCurrentLocked && (currentQuestion.explanation || currentQuestion.postalRuleRef) && (
          <View style={[AppStyles.card, styles.expCard]}>
            <Text style={styles.expTitle}>Explanation & Postal Rule Reference</Text>
            {!!currentQuestion.explanation && (
              <Text style={styles.expText}>{currentQuestion.explanation}</Text>
            )}
            {!!currentQuestion.postalRuleRef && (
              <Text style={styles.ruleRef}>Ref: {currentQuestion.postalRuleRef}</Text>
            )}
          </View>
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
        <TouchableOpacity
          style={[
            AppStyles.primaryButton,
            { flex: 1 },
            currentIndex >= questions.length - 1 && { opacity: 0.4 },
          ]}
          onPress={nextQuestion}
          disabled={currentIndex >= questions.length - 1}
        >
          <Text style={AppStyles.primaryButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  emptySub: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center' },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.surfaceCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppColors.surfaceWarmWhite,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderSubtle,
  },
  progressText: { fontSize: 13, fontWeight: '700', color: AppColors.primaryNavy },
  scoreRow: { flexDirection: 'row', gap: 12 },
  scoreChip: { fontSize: 13, fontWeight: '800' },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  qCard: { padding: 16, gap: 10 },
  qMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  qNumber: { fontSize: 12, fontWeight: '800', color: AppColors.secondaryMaroon },
  qDiff: { fontSize: 12, fontWeight: '700', color: AppColors.textMuted },
  qText: { fontSize: 16, fontWeight: '700', color: AppColors.textPrimary, lineHeight: 23 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
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
  expCard: { padding: 14, backgroundColor: '#FFFBEB', borderColor: AppColors.goldBorder, gap: 6 },
  expTitle: { fontSize: 13, fontWeight: '800', color: AppColors.primaryNavy },
  expText: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 19 },
  ruleRef: { fontSize: 12, fontWeight: '700', color: AppColors.secondaryMaroon },
  navBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: AppColors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
  },
});
