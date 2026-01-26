import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NavPageLayout } from '@/components/NavPageLayout';
import { UserProfile } from '@/lib/api';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, User as UserIcon, UserRound, Check, X, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

interface ConfigPageProps {
  isMobileV2: boolean;
  isLoggedIn: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  profileForm: {
    fullName: string;
    username: string;
    timezone: string;
    language: string;
    leftie: boolean;
    avatarType: string;
    avatarColor: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  setProfileForm: (fn: (prev: typeof profileForm) => typeof profileForm) => void;
  initialProfileForm: {
    fullName: string;
    username: string;
    timezone: string;
    language: string;
    leftie: boolean;
    avatarType: string;
    avatarColor: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  } | null;
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
  usernameError: string;
  isUsernameCooldown: boolean;
  showAvatarEditor: boolean;
  setShowAvatarEditor: (show: boolean) => void;
  avatarDirty: boolean;
  setAvatarDirty: (dirty: boolean) => void;
  profileSaving: boolean;
  handleProfileSave: () => Promise<void>;
  handleUsernameCheck: () => Promise<void>;
  setUsernameStatus: (status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid') => void;
  setUsernameError: (error: string) => void;
  passwordError: string;
  passwordStatus: 'idle' | 'validating' | 'error' | 'success';
  setPasswordError: (error: string) => void;
  setPasswordStatus: (status: 'idle' | 'validating' | 'error' | 'success') => void;
  setShowNavOverlay: (show: boolean) => void;
  timeZoneOptions: string[];
  avatarOptions: readonly Array<{ id: string; label: string; Icon?: typeof UserIcon }>;
  avatarColors: readonly Array<{ id: string; label: string; bg: string; text: string }>;
}

export function ConfigPage({
  isMobileV2,
  isLoggedIn,
  user,
  userProfile,
  profileForm,
  setProfileForm,
  initialProfileForm,
  usernameStatus,
  usernameError,
  isUsernameCooldown,
  showAvatarEditor,
  setShowAvatarEditor,
  avatarDirty,
  setAvatarDirty,
  profileSaving,
  handleProfileSave,
  handleUsernameCheck,
  setUsernameStatus,
  setUsernameError,
  passwordError,
  passwordStatus,
  setPasswordError,
  setPasswordStatus,
  setShowNavOverlay,
  timeZoneOptions,
  avatarOptions,
  avatarColors,
}: ConfigPageProps) {
  const navigate = useNavigate();
  const isSpanish = profileForm.language === 'es';
  const t = (en: string, es: string) => (isSpanish ? es : en);
  
  const avatarLetter = (profileForm.fullName || user?.email || 'Q').trim().charAt(0).toUpperCase() || 'Q';
  const selectedAvatarColor =
    avatarColors.find((color) => color.id === profileForm.avatarColor) ?? avatarColors[0];

  const hasChanges = useMemo(() => {
    if (!initialProfileForm) return false;
    return (
      profileForm.fullName !== initialProfileForm.fullName ||
      profileForm.username !== initialProfileForm.username ||
      profileForm.timezone !== initialProfileForm.timezone ||
      profileForm.language !== initialProfileForm.language ||
      profileForm.leftie !== initialProfileForm.leftie ||
      profileForm.avatarType !== initialProfileForm.avatarType ||
      profileForm.avatarColor !== initialProfileForm.avatarColor ||
      profileForm.currentPassword !== '' ||
      profileForm.newPassword !== '' ||
      profileForm.confirmPassword !== '' ||
      avatarDirty
    );
  }, [profileForm, initialProfileForm, avatarDirty]);

  // Clear password errors when user starts typing
  const handlePasswordChange = (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (passwordError) {
      setPasswordError('');
      setPasswordStatus('idle');
    }
  };

  return (
    <NavPageLayout
      sectionLabel="Config"
      title="User Preferences"
      isMobileV2={isMobileV2}
      onTitleClick={() => setShowNavOverlay(true)}
    >
      {isMobileV2 ? (
        <div className="flex flex-col min-h-0 space-y-6">
          {!isLoggedIn ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground space-y-4">
              <p>From here you can customize your experience and preferences.</p>
              <p>Please log in or create an account to unlock settings, exports, and team features.</p>
              <div className="flex flex-col sm:flex-row gap-2 text-sm">
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 transition"
                  onClick={() => navigate('/login')}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="text-primary hover:text-primary/80 transition"
                  onClick={() => navigate('/login')}
                >
                  Sign Up
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Theme</p>
                  <ThemeToggle storageKey={`theme:${user?.id ?? 'default'}`} />
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t('Profile', 'Perfil')}
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAvatarEditor(true)}
                      className={`flex h-20 w-20 items-center justify-center rounded-full border border-border/60 ${selectedAvatarColor.bg} ${selectedAvatarColor.text}`}
                      aria-label="Edit avatar"
                    >
                      {profileForm.avatarType === 'letter' ? (
                        <span className="text-2xl font-semibold">{avatarLetter}</span>
                      ) : profileForm.avatarType === 'cap' ? (
                        <GraduationCap className="h-8 w-8" />
                      ) : profileForm.avatarType === 'bun' ? (
                        <UserRound className="h-8 w-8" />
                      ) : (
                        <UserIcon className="h-8 w-8" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition"
                      onClick={() => setShowAvatarEditor(true)}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Choose an avatar style and color that fits your brand.
                  </div>
                </div>
                <Input
                  value={profileForm.fullName}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder={t('Full Name', 'Nombre completo')}
                  className="bg-secondary/40 border-border"
                />
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={profileForm.username}
                      onChange={(event) => {
                        setProfileForm((prev) => ({
                          ...prev,
                          username: event.target.value.slice(0, 18),
                        }));
                        setUsernameStatus('idle');
                        setUsernameError('');
                      }}
                      onBlur={handleUsernameCheck}
                      placeholder={t('Username (max 18 characters)', 'Nombre de usuario (max 18 caracteres)')}
                      disabled={isUsernameCooldown}
                      className={`bg-secondary/40 border-border ${usernameError ? 'border-destructive animate-shake' : ''} ${isUsernameCooldown ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-border uppercase tracking-[0.2em] text-[10px] disabled:opacity-50"
                      onClick={handleUsernameCheck}
                      disabled={isUsernameCooldown || !profileForm.username.trim() || usernameStatus === 'checking'}
                    >
                      {usernameStatus === 'checking' ? t('Checking...', 'Verificando...') : t('Check', 'Verificar')}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isUsernameCooldown && t('Username changes are on cooldown.', 'El cambio de usuario esta en espera.')}
                    {usernameStatus === 'checking' && t('Checking availability...', 'Verificando disponibilidad...')}
                    {usernameStatus === 'available' && t('Username is available.', 'Nombre de usuario disponible.')}
                    {usernameStatus === 'taken' && (usernameError || t('Username is already taken.', 'Nombre de usuario ya esta en uso.'))}
                    {usernameStatus === 'invalid' && (usernameError || t('Please keep it family friendly.', 'Mantengamoslo apto para todos.'))}
                    {!isUsernameCooldown && usernameStatus === 'idle' && t('Usernames can be changed once every 30 days.', 'Los nombres de usuario se pueden cambiar cada 30 dias.')}
                  </div>
                  {userProfile?.usernameChangedAt && (
                    <div className="text-[11px] text-muted-foreground">
                      {t('Next change available:', 'Proximo cambio disponible:')}{' '}
                      {new Date(new Date(userProfile.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {showAvatarEditor && (
                  <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
                    onClick={() => setShowAvatarEditor(false)}
                  >
                    <div
                      className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Avatar</p>
                        <button
                          type="button"
                          className="text-xs uppercase tracking-[0.3em] text-primary"
                          onClick={() => setShowAvatarEditor(false)}
                        >
                          Done
                        </button>
                      </div>
                      <div className="flex items-center justify-center">
                        <div
                          className={`flex h-24 w-24 items-center justify-center rounded-full border border-border/60 ${selectedAvatarColor.bg} ${selectedAvatarColor.text}`}
                        >
                          {profileForm.avatarType === 'letter' ? (
                            <span className="text-3xl font-semibold">{avatarLetter}</span>
                          ) : profileForm.avatarType === 'cap' ? (
                            <GraduationCap className="h-10 w-10" />
                          ) : profileForm.avatarType === 'bun' ? (
                            <UserRound className="h-10 w-10" />
                          ) : (
                            <UserIcon className="h-10 w-10" />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {avatarOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.3em] transition ${
                              profileForm.avatarType === option.id
                                ? 'border-primary bg-secondary/50 text-foreground'
                                : 'border-border/60 bg-secondary/20 text-muted-foreground hover:border-primary/60'
                            }`}
                            onClick={() => {
                              setProfileForm((prev) => ({ ...prev, avatarType: option.id as any }))
                              setAvatarDirty(true)
                            }}
                          >
                            {option.id === 'letter' ? (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-sm font-semibold">
                                {avatarLetter}
                              </span>
                            ) : option.Icon ? (
                              <option.Icon className="h-5 w-5" />
                            ) : null}
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Color</p>
                        <div className="grid grid-cols-4 gap-2">
                          {avatarColors.map((color) => (
                            <button
                              key={color.id}
                              type="button"
                              className={`h-10 w-10 rounded-full border ${color.bg} ${color.text} ${
                                profileForm.avatarColor === color.id ? 'ring-2 ring-primary' : 'border-border/60'
                              }`}
                              onClick={() => {
                                setProfileForm((prev) => ({ ...prev, avatarColor: color.id }))
                                setAvatarDirty(true)
                              }}
                              aria-label={color.label}
                            >
                              {profileForm.avatarColor === color.id ? '✓' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Leftie</p>
                    <p className="text-[11px] text-muted-foreground">Left-sided dial controls</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profileForm.leftie}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, leftie: event.target.checked }))
                    }
                    className="accent-primary h-4 w-4"
                    aria-label="Leftie"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {t('Timezone', 'Zona horaria')}
                    <select
                      value={profileForm.timezone}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, timezone: event.target.value }))
                      }
                      className="mt-2 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">{t('Auto-detect', 'Deteccion automatica')}</option>
                      {timeZoneOptions.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {t('Language', 'Idioma')}
                    <select
                      value={profileForm.language}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, language: event.target.value }))
                      }
                      className="mt-2 w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                  </label>
                </div>
                <div className="space-y-2 pt-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {t('Change Password', 'Cambiar contrasena')}
                  </p>
                  <Input
                    value={profileForm.currentPassword}
                    onChange={(event) => handlePasswordChange('currentPassword', event.target.value)}
                    placeholder={t('Current Password', 'Contrasena actual')}
                    type="password"
                    className={`bg-secondary/40 border-border ${passwordError && passwordStatus === 'error' ? 'border-destructive animate-shake' : ''}`}
                  />
                  <Input
                    value={profileForm.newPassword}
                    onChange={(event) => handlePasswordChange('newPassword', event.target.value)}
                    placeholder={t('New Password', 'Nueva contrasena')}
                    type="password"
                    className={`bg-secondary/40 border-border ${passwordError && passwordStatus === 'error' ? 'border-destructive animate-shake' : ''}`}
                  />
                  <Input
                    value={profileForm.confirmPassword}
                    onChange={(event) => handlePasswordChange('confirmPassword', event.target.value)}
                    placeholder={t('Confirm New Password', 'Confirmar nueva contrasena')}
                    type="password"
                    className={`bg-secondary/40 border-border ${passwordError && passwordStatus === 'error' ? 'border-destructive animate-shake' : ''}`}
                  />
                  {passwordError && passwordStatus === 'error' && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <X className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                  {passwordStatus === 'validating' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                      <span>{t('Validating password...', 'Validando contraseña...')}</span>
                    </div>
                  )}
                  {passwordStatus === 'success' && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                      <Check className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{t('Password updated successfully!', '¡Contraseña actualizada exitosamente!')}</span>
                    </div>
                  )}
                </div>
                {isMobileV2 && (hasChanges ? <div className="h-20" /> : <div className="h-4" />)}
              </div>
              {isMobileV2 && hasChanges && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                  <Button
                    type="button"
                    className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs shadow-lg pointer-events-auto"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                  >
                    {profileSaving ? t('Saving...', 'Guardando...') : t('Save Preferences', 'Guardar preferencias')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <section id="config" className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Config</p>
                <h2
                  className="text-2xl sm:text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                  onClick={() => setShowNavOverlay(true)}
                >
                  User Preferences
                </h2>
              </div>
              {!isLoggedIn ? (
                <div className="glass-panel rounded-2xl p-6 text-sm text-muted-foreground space-y-4">
                  <p>From here you can customize your experience and preferences.</p>
                  <p>Please log in or create an account to unlock settings, exports, and team features.</p>
                  <div className="flex flex-col sm:flex-row gap-2 text-sm">
                    <button
                      type="button"
                      className="text-primary hover:text-primary/80 transition"
                      onClick={() => navigate('/login')}
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      className="text-primary hover:text-primary/80 transition"
                      onClick={() => navigate('/login')}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>
              ) : (
                // Desktop Layout - Redesigned with centered profile icon
                <div className="space-y-6">
              {/* Profile Section - Centered */}
              <div className="glass-panel rounded-2xl p-8 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAvatarEditor(true)}
                      className={`flex h-28 w-28 items-center justify-center rounded-full border-2 border-border/60 shadow-lg transition-all hover:scale-105 hover:shadow-xl ${selectedAvatarColor.bg} ${selectedAvatarColor.text}`}
                      aria-label="Edit avatar"
                    >
                      {profileForm.avatarType === 'letter' ? (
                        <span className="text-4xl font-semibold">{avatarLetter}</span>
                      ) : profileForm.avatarType === 'cap' ? (
                        <GraduationCap className="h-12 w-12" />
                      ) : profileForm.avatarType === 'bun' ? (
                        <UserRound className="h-12 w-12" />
                      ) : (
                        <UserIcon className="h-12 w-12" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAvatarEditor(true)}
                      className="absolute -bottom-2 -right-2 rounded-full bg-primary text-primary-foreground p-2 shadow-lg hover:scale-110 transition-transform"
                      aria-label="Edit avatar"
                    >
                      <UserIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-foreground">{profileForm.fullName || user?.email || 'User'}</p>
                    <p className="text-xs text-muted-foreground">@{profileForm.username || 'username'}</p>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Theme</p>
                    <p className="text-[11px] text-muted-foreground">Light or Dark mode</p>
                  </div>
                  <ThemeToggle storageKey={`theme:${user?.id ?? 'default'}`} />
                </div>
              </div>

              {/* Profile Information Card */}
              <div className="glass-panel rounded-2xl p-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
                    {t('Profile Information', 'Información del Perfil')}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        {t('Full Name', 'Nombre completo')}
                      </label>
                      <Input
                        value={profileForm.fullName}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                        }
                        placeholder={t('Full Name', 'Nombre completo')}
                        className="bg-secondary/40 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        {t('Username', 'Nombre de usuario')}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={profileForm.username}
                          onChange={(event) => {
                            setProfileForm((prev) => ({
                              ...prev,
                              username: event.target.value.slice(0, 18),
                            }));
                            setUsernameStatus('idle');
                            setUsernameError('');
                          }}
                          onBlur={handleUsernameCheck}
                          placeholder={t('Username (max 18 characters)', 'Nombre de usuario (max 18 caracteres)')}
                          disabled={isUsernameCooldown}
                          className={`flex-1 bg-secondary/40 border-border ${usernameError ? 'border-destructive animate-shake' : ''} ${isUsernameCooldown ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-border uppercase tracking-[0.2em] text-[10px] disabled:opacity-50"
                          onClick={handleUsernameCheck}
                          disabled={isUsernameCooldown || !profileForm.username.trim() || usernameStatus === 'checking'}
                        >
                          {usernameStatus === 'checking' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : usernameStatus === 'available' ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : usernameStatus === 'taken' || usernameStatus === 'invalid' ? (
                            <X className="h-3.5 w-3.5" />
                          ) : (
                            t('Check', 'Verificar')
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground min-h-[1.25rem]">
                        {isUsernameCooldown && (
                          <span className="text-amber-600 dark:text-amber-400">{t('Username changes are on cooldown.', 'El cambio de usuario esta en espera.')}</span>
                        )}
                        {usernameStatus === 'checking' && (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t('Checking availability...', 'Verificando disponibilidad...')}
                          </span>
                        )}
                        {usernameStatus === 'available' && (
                          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            {t('Username is available.', 'Nombre de usuario disponible.')}
                          </span>
                        )}
                        {usernameStatus === 'taken' && (
                          <span className="flex items-center gap-1.5 text-destructive">
                            <X className="h-3 w-3" />
                            {usernameError || t('Username is already taken.', 'Nombre de usuario ya esta en uso.')}
                          </span>
                        )}
                        {usernameStatus === 'invalid' && (
                          <span className="flex items-center gap-1.5 text-destructive">
                            <X className="h-3 w-3" />
                            {usernameError || t('Please keep it family friendly.', 'Mantengamoslo apto para todos.')}
                          </span>
                        )}
                        {!isUsernameCooldown && usernameStatus === 'idle' && (
                          <span>{t('Usernames can be changed once every 30 days.', 'Los nombres de usuario se pueden cambiar cada 30 dias.')}</span>
                        )}
                      </div>
                      {userProfile?.usernameChangedAt && (
                        <div className="text-[11px] text-muted-foreground">
                          {t('Next change available:', 'Proximo cambio disponible:')}{' '}
                          {new Date(new Date(userProfile.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences Card */}
              <div className="glass-panel rounded-2xl p-6 space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
                    {t('Preferences', 'Preferencias')}
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Leftie</p>
                        <p className="text-[11px] text-muted-foreground">Left-sided dial controls</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileForm.leftie}
                        onChange={(event) =>
                          setProfileForm((prev) => ({ ...prev, leftie: event.target.checked }))
                        }
                        className="accent-primary h-4 w-4"
                        aria-label="Leftie"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                          {t('Timezone', 'Zona horaria')}
                        </label>
                        <select
                          value={profileForm.timezone}
                          onChange={(event) =>
                            setProfileForm((prev) => ({ ...prev, timezone: event.target.value }))
                          }
                          className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
                        >
                          <option value="">{t('Auto-detect', 'Deteccion automatica')}</option>
                          {timeZoneOptions.map((zone) => (
                            <option key={zone} value={zone}>
                              {zone}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                          {t('Language', 'Idioma')}
                        </label>
                        <select
                          value={profileForm.language}
                          onChange={(event) =>
                            setProfileForm((prev) => ({ ...prev, language: event.target.value }))
                          }
                          className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change Card */}
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
                    {t('Change Password', 'Cambiar contrasena')}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        {t('Current Password', 'Contrasena actual')}
                      </label>
                      <Input
                        value={profileForm.currentPassword}
                        onChange={(event) => handlePasswordChange('currentPassword', event.target.value)}
                        placeholder={t('Current Password', 'Contrasena actual')}
                        type="password"
                        className={`bg-secondary/40 border-border ${passwordError && passwordStatus === 'error' ? 'border-destructive animate-shake' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        {t('New Password', 'Nueva contrasena')}
                      </label>
                      <Input
                        value={profileForm.newPassword}
                        onChange={(event) => handlePasswordChange('newPassword', event.target.value)}
                        placeholder={t('New Password', 'Nueva contrasena')}
                        type="password"
                        className={`bg-secondary/40 border-border ${passwordError && passwordStatus === 'error' ? 'border-destructive animate-shake' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2 block">
                        {t('Confirm New Password', 'Confirmar nueva contrasena')}
                      </label>
                      <Input
                        value={profileForm.confirmPassword}
                        onChange={(event) => handlePasswordChange('confirmPassword', event.target.value)}
                        placeholder={t('Confirm New Password', 'Confirmar nueva contrasena')}
                        type="password"
                        className={`bg-secondary/40 border-border ${passwordError && passwordStatus === 'error' ? 'border-destructive animate-shake' : ''}`}
                      />
                    </div>
                    {passwordError && passwordStatus === 'error' && (
                      <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <X className="h-4 w-4 flex-shrink-0" />
                        <span>{passwordError}</span>
                      </div>
                    )}
                    {passwordStatus === 'validating' && (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-xs text-primary">
                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                        <span>{t('Validating password...', 'Validando contraseña...')}</span>
                      </div>
                    )}
                    {passwordStatus === 'success' && (
                      <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-2 text-xs text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4 flex-shrink-0" />
                        <span>{t('Password updated successfully!', '¡Contraseña actualizada exitosamente!')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Avatar Editor Modal */}
              {showAvatarEditor && (
                <div
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
                  onClick={() => setShowAvatarEditor(false)}
                >
                  <div
                    className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Avatar</p>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.3em] text-primary"
                        onClick={() => setShowAvatarEditor(false)}
                      >
                        Done
                      </button>
                    </div>
                    <div className="flex items-center justify-center">
                      <div
                        className={`flex h-24 w-24 items-center justify-center rounded-full border border-border/60 ${selectedAvatarColor.bg} ${selectedAvatarColor.text}`}
                      >
                        {profileForm.avatarType === 'letter' ? (
                          <span className="text-3xl font-semibold">{avatarLetter}</span>
                        ) : profileForm.avatarType === 'cap' ? (
                          <GraduationCap className="h-10 w-10" />
                        ) : profileForm.avatarType === 'bun' ? (
                          <UserRound className="h-10 w-10" />
                        ) : (
                          <UserIcon className="h-10 w-10" />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {avatarOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.3em] transition ${
                            profileForm.avatarType === option.id
                              ? 'border-primary bg-secondary/50 text-foreground'
                              : 'border-border/60 bg-secondary/20 text-muted-foreground hover:border-primary/60'
                          }`}
                          onClick={() => {
                            setProfileForm((prev) => ({ ...prev, avatarType: option.id as any }))
                            setAvatarDirty(true)
                          }}
                        >
                          {option.id === 'letter' ? (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-sm font-semibold">
                              {avatarLetter}
                            </span>
                          ) : option.Icon ? (
                            <option.Icon className="h-5 w-5" />
                          ) : null}
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Color</p>
                      <div className="grid grid-cols-4 gap-2">
                        {avatarColors.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            className={`h-10 w-10 rounded-full border ${color.bg} ${color.text} ${
                              profileForm.avatarColor === color.id ? 'ring-2 ring-primary' : 'border-border/60'
                            }`}
                            onClick={() => {
                              setProfileForm((prev) => ({ ...prev, avatarColor: color.id }))
                              setAvatarDirty(true)
                            }}
                            aria-label={color.label}
                          >
                            {profileForm.avatarColor === color.id ? '✓' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              {hasChanges && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="bg-gradient-primary text-primary-foreground uppercase tracking-[0.2em] text-xs px-8"
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('Saving...', 'Guardando...')}
                      </>
                    ) : (
                      t('Save Preferences', 'Guardar preferencias')
                    )}
                  </Button>
                </div>
              )}
                </div>
              )}
            </section>
          )}
    </NavPageLayout>
  );
}
