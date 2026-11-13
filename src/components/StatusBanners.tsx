import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Language, translations } from '../i18n';

interface StatusBannersProps {
  lang: Language;
  hasError: boolean;
  errorType?: 'permission' | 'generic' | null;
  onRetry: () => void;
}

export const StatusBanners: React.FC<StatusBannersProps> = ({
  lang,
  hasError,
  errorType = 'generic',
  onRetry,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const t = translations[lang].states;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isPermission = errorType === 'permission';

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <div
          role="status"
          className="absolute top-20 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-700 bg-amber-950/95 border border-amber-600/80 text-amber-100 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top duration-200"
        >
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <h4 className="font-bold font-mono">{t.offlineTitle}</h4>
            <p className="text-amber-200/90">{t.offlineMessage}</p>
          </div>
        </div>
      )}

      {/* Firestore Read / Permission Error Banner with Retry */}
      {hasError && isOnline && (
        <div
          role="alert"
          className="absolute top-20 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-sm z-700 bg-red-950/95 border border-red-600/80 text-red-100 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top duration-200"
        >
          {isPermission ? (
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-2 text-xs flex-1">
            <h4 className="font-bold font-mono">
              {isPermission ? t.permissionDeniedTitle : t.errorTitle}
            </h4>
            <p className="text-red-200/90">
              {isPermission ? t.permissionDeniedMessage : t.errorMessage}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-red-900 hover:bg-red-800 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.retry}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
