import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '../../core/theme';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';
import { CustomAppDrawer } from '../../shared/CustomAppDrawer';
import { HomeScreen } from '../home/HomeScreen';
import { ExamListScreen } from '../mcq/ExamListScreen';
import { LiveTestsScreen } from '../live_tests/LiveTestsScreen';
import { NotesScreen } from '../notes/NotesScreen';
import { VideosScreen } from '../videos/VideosScreen';

type TabKey = 'HomeTab' | 'McqTab' | 'LiveTestsTab' | 'NotesTab' | 'VideosTab';

export const MainNavScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('HomeTab');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'HomeTab', label: 'Home', icon: 'home' },
    { key: 'McqTab', label: 'MCQs', icon: 'checkmark-circle' },
    { key: 'LiveTestsTab', label: 'Live Tests', icon: 'timer' },
    { key: 'NotesTab', label: 'Notes', icon: 'document-text' },
    { key: 'VideosTab', label: 'Videos', icon: 'play-circle' },
  ];

  const renderBody = () => {
    switch (activeTab) {
      case 'McqTab':
        return <ExamListScreen />;
      case 'LiveTestsTab':
        return <LiveTestsScreen />;
      case 'NotesTab':
        return <NotesScreen />;
      case 'VideosTab':
        return <VideosScreen />;
      case 'HomeTab':
      default:
        return <HomeScreen onSelectTab={(t) => setActiveTab(t as TabKey)} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: AppColors.bgWarm }}>
      <TenaliTopAppBar onMenuPress={() => setDrawerOpen(true)} />
      <View style={{ flex: 1 }}>{renderBody()}</View>

      <SafeAreaView edges={['bottom']} style={styles.tabBarWrap}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={22}
                  color={selected ? AppColors.secondaryMaroon : AppColors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: selected ? AppColors.secondaryMaroon : AppColors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      <CustomAppDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectTab={(t) => setActiveTab(t as TabKey)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrap: {
    backgroundColor: AppColors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
  },
  tabBar: {
    flexDirection: 'row',
    height: 58,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
