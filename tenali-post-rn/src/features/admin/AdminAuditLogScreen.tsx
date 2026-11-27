import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppColors, AppStyles } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { StatusBadge } from '../../core/widgets/AdminUi';
import { useLmsAdmin } from '../../providers/LmsAdminContext';

export const AdminAuditLogScreen: React.FC = () => {
  const { auditLogs, loadAuditLogs } = useLmsAdmin();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAuditLogs('all', search);
  }, [search]);

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title="Admin Audit Trail" showBack />
      <View style={styles.searchWrap}>
        <TextInput
          style={AppStyles.input}
          placeholder="Search action, target, or admin email..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={auditLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[AppStyles.card, styles.card]}>
            <View style={styles.rowBetween}>
              <StatusBadge label={item.actionType} variant="info" />
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.target}>
              {item.targetType.toUpperCase()} • {item.targetName}
            </Text>
            <Text style={styles.admin}>By: {item.adminEmail}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchWrap: { padding: 14, paddingBottom: 4 },
  list: { padding: 14, gap: 10 },
  card: { padding: 12, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 11, color: AppColors.textMuted },
  target: { fontSize: 14, fontWeight: '700', color: AppColors.primaryNavy },
  admin: { fontSize: 12, color: AppColors.textSecondary },
});
