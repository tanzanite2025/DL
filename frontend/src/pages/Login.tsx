import React, { useState } from 'react';
import { UdsButton, UdsCard, UdsInput } from '../components/uds/UdsComponents';
import { useI18n } from '../i18n/I18nContext';
import { ShowToast } from '../types';
import { authApi } from '../services/api';

interface LoginProps {
  onLoginSuccess: (token: string, userId: string) => void;
  showToast: ShowToast;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, showToast }) => {
  const { language, setLanguage, t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      showToast(t('errLoginEmpty'), 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 登录只验证 TOKEN 和 USER ID，禁止拉取其他任何数据
      const data = await authApi.login(username, password);

      // 校验返回值是否完整
      if (!data.token || !data.userId) {
        throw new Error(t('errCriticalLoginIncomplete'));
      }

      showToast(t('loginSuccess'), 'success');
      onLoginSuccess(data.token, data.userId);
    } catch (error: any) {
      console.error('[CRITICAL] ' + t('criticalLoginException') + ':', error);
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 relative">
      {/* 语言切换悬浮按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <UdsButton
          variant="ghost"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          className="h-8 px-3 text-[9px] font-bold text-white bg-white/5 hover:bg-white/10 rounded-full"
        >
          {t('toggleLanguageText')}
        </UdsButton>
      </div>

      {/* 背景格线装饰 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 animate-uds-fade">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[16px] bg-white/5">
            <span className="text-xl font-bold tracking-tighter italic text-white">DL</span>
          </div>
        </div>

        <UdsCard title={t('operatorSignIn')} variant="dashed">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2">
            <UdsInput
              label={t('operatorCode')}
              placeholder={t('loginPlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              required
            />

            <UdsInput
              label={t('accessKey')}
              type="password"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              required
            />

            <div className="border-t border-solid border-white/5 pt-4">
              <UdsButton
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? t('verifying') : t('initiateAccess')}
              </UdsButton>
            </div>
          </form>
        </UdsCard>
      </div>
    </div>
  );
};
