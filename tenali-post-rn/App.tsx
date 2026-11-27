import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders } from './src/providers/AppProviders';

import { SplashScreen } from './src/features/splash/SplashScreen';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { ProfileCompletionScreen } from './src/features/profile/ProfileCompletionScreen';
import { MainNavScreen } from './src/features/navigation/MainNavScreen';
import { ProfileScreen } from './src/features/profile/ProfileScreen';
import { NotificationsScreen } from './src/features/notifications/NotificationsScreen';
import { ChapterListScreen } from './src/features/mcq/ChapterListScreen';
import { McqPracticeScreen } from './src/features/mcq/McqPracticeScreen';
import { LiveTestRunnerScreen } from './src/features/live_tests/LiveTestRunnerScreen';
import { LiveTestResultScreen } from './src/features/live_tests/LiveTestResultScreen';
import { ProtectedPdfViewerScreen } from './src/features/notes/ProtectedPdfViewerScreen';
import { VideoPlayerScreen } from './src/features/videos/VideoPlayerScreen';

import { AdminDashboardScreen } from './src/features/admin/AdminDashboardScreen';
import { AdminMcqScreen } from './src/features/admin/AdminMcqScreen';
import { AdminLiveTestsScreen } from './src/features/admin/AdminLiveTestsScreen';
import { AdminNotesScreen } from './src/features/admin/AdminNotesScreen';
import { AdminStudentsScreen } from './src/features/admin/AdminStudentsScreen';
import { AdminAnnouncementsScreen } from './src/features/admin/AdminAnnouncementsScreen';
import { AdminSettingsScreen } from './src/features/admin/AdminSettingsScreen';
import { AdminAuditLogScreen } from './src/features/admin/AdminAuditLogScreen';
import { AdminContentScreen } from './src/features/admin/AdminContentScreen';
import { AdminVideosScreen } from './src/features/admin/AdminVideosScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
            <Stack.Screen name="MainNav" component={MainNavScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="ChapterList" component={ChapterListScreen} />
            <Stack.Screen name="McqPractice" component={McqPracticeScreen} />
            <Stack.Screen name="LiveTestRunner" component={LiveTestRunnerScreen} />
            <Stack.Screen name="LiveTestResult" component={LiveTestResultScreen} />
            <Stack.Screen name="ProtectedPdfViewer" component={ProtectedPdfViewerScreen} />
            <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />

            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminMcq" component={AdminMcqScreen} />
            <Stack.Screen name="AdminLiveTests" component={AdminLiveTestsScreen} />
            <Stack.Screen name="AdminNotes" component={AdminNotesScreen} />
            <Stack.Screen name="AdminStudents" component={AdminStudentsScreen} />
            <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
            <Stack.Screen name="AdminAuditLog" component={AdminAuditLogScreen} />
            <Stack.Screen name="AdminContent" component={AdminContentScreen} />
            <Stack.Screen name="AdminVideos" component={AdminVideosScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProviders>
    </SafeAreaProvider>
  );
}
