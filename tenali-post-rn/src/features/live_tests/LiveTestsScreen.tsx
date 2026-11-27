import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppColors, AppStyles } from '../../core/theme';
import { useLiveTest } from '../../providers/LiveTestContext';
import {
  isLiveTestEnded,
  isLiveTestOngoing,
  isLiveTestUpcoming,
  LiveTest,
} from '../../models';

export const LiveTestsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { liveTests, isLoading, loadLiveTests, startLiveTest } = useLiveTest();

  useEffect(() => {
    loadLiveTests();
  }, []);

  const handleStart = async (test: LiveTest) => {
    const ok = await startLiveTest(test);
    if (ok) {
      navigation.navigate('LiveTestRunner', { test });
    }
  };

  if (isLoading && liveTests.length === 0) {
    return (
      <View style={[AppStyles.screenContainer, styles.center]}>
        <ActivityIndicator size="large" color={AppColors.primaryNavy} />
      </View>
    );
  }

  return (
    <View style={AppStyles.screenContainer}>
      <FlatList
        data={liveTests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="timer-outline" size={54} color={AppColors.textMuted} />
            <Text style={styles.emptyTitle}>No Live Tests Scheduled</Text>
            <Text style={styles.emptySub}>
              Upcoming All-India Postal Mock Tests will appear here once published by Admin.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const ongoing = isLiveTestOngoing(item);
          const upcoming = isLiveTestUpcoming(item);
          const ended = isLiveTestEnded(item);

          return (
            <View style={[AppStyles.card, styles.card]}>
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.statusPill,
                    ongoing
                      ? { backgroundColor: AppColors.successGreenBg }
                      : upcoming
                      ? { backgroundColor: '#FEF3C7' }
                      : { backgroundColor: AppColors.surfaceCream },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      ongoing
                        ? { color: AppColors.successGreen }
                        : upcoming
                        ? { color: '#B45309' }
                        : { color: AppColors.textSecondary },
                    ]}
                  >
                    {ongoing ? 'LIVE NOW' : upcoming ? 'UPCOMING' : 'ENDED'}
                  </Text>
                </View>
                <Text style={styles.metaText}>{item.durationMinutes} Mins</Text>
              </View>

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc}>{item.description}</Text>

              <View style={styles.statsRow}>
                <Text style={styles.statChip}>{item.totalQuestions} Questions</Text>
                <Text style={styles.statChip}>{item.totalMarks} Marks</Text>
              </View>

              <TouchableOpacity
                style={[AppStyles.primaryButton, ended && { backgroundColor: AppColors.primaryNavy }]}
                onPress={() => handleStart(item)}
              >
                <Text style={AppStyles.primaryButtonText}>
                  {ongoing ? 'Start Live Test' : 'Attempt Mock Test'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: AppColors.primaryNavy },
  emptySub: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center' },
  list: { padding: 16, gap: 14 },
  card: { padding: 16, gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  metaText: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
  title: { fontSize: 16, fontWeight: '800', color: AppColors.primaryNavy },
  desc: { fontSize: 13, color: AppColors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primaryNavy,
    backgroundColor: AppColors.surfaceCream,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
