import React from 'react';
import { AuthProvider } from './AuthContext';
import { McqProvider } from './McqContext';
import { LiveTestProvider } from './LiveTestContext';
import { NotificationProvider } from './NotificationContext';
import { AdminProvider } from './AdminContext';
import { LmsAdminProvider } from './LmsAdminContext';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <McqProvider>
        <LiveTestProvider>
          <NotificationProvider>
            <AdminProvider>
              <LmsAdminProvider>{children}</LmsAdminProvider>
            </AdminProvider>
          </NotificationProvider>
        </LiveTestProvider>
      </McqProvider>
    </AuthProvider>
  );
};
