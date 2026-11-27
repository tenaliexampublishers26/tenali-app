import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { StatusBadge } from '../../core/widgets/AdminUi';
import { useAdmin } from '../../providers/AdminContext';
import { useAuth } from '../../providers/AuthContext';

export const AdminStudentsScreen: React.FC = () => {
  const { user } = useAuth();
  const { students, loadStudents, toggleStudentStatus } = useAdmin();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadStudents({ searchQuery: search });
  }, [search]);

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Student Directory" showBack />
      <View style={styles.searchWrap}>
        <TextInput
          style={AppStyles.input}
          placeholder="Search by name, email, or phone..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[AppStyles.card, styles.card]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.meta}>
                  {item.phoneNumber} • {item.postalCircle} • {item.targetExam}
                </Text>
              </View>
              <StatusBadge
                label={item.status}
                variant={item.status === 'Active' ? 'success' : 'error'}
              />
            </View>
            <View style={styles.footer}>
              <Text style={styles.perf}>
                Tests: {item.totalTestsAttempted} • Avg: {item.averagePercentage.toFixed(1)}%
              </Text>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() =>
                  toggleStudentStatus(
                    item.id,
                    item.status === 'Active' ? 'Suspended' : 'Active',
                    user?.email || 'admin'
                  )
                }
              >
                <Text style={styles.toggleText}>
                  {item.status === 'Active' ? 'Suspend' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchWrap: { padding: 14, paddingBottom: 4 },
  list: { padding: 14, gap: 12 },
  card: { padding: 14, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy },
  email: { fontSize: 12, color: AppColors.textSecondary },
  meta: { fontSize: 11, color: AppColors.textMuted, marginTop: 3 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
    paddingTop: 8,
  },
  perf: { fontSize: 12, fontWeight: '700', color: AppColors.primaryNavy },
  toggleBtn: {
    backgroundColor: AppColors.surfaceCream,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleText: { fontSize: 12, fontWeight: '700', color: AppColors.secondaryMaroon },
});
