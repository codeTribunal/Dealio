'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthLayout from '@/components/AuthLayout'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/icons/Icon'
import { useBusiness } from '@/lib/businessContext'
import { useI18n } from '@/lib/i18n/i18nContext'
import { clearToken, getPhone } from '@/lib/auth'

/**
 * Account / profile page. Reached from the avatar in the TopBar (which is now a
 * link, no longer a dead control). Holds the owner's identity and account
 * actions; full business configuration still lives in /settings.
 */
export default function ProfilePage() {
  const router = useRouter()
  const { business } = useBusiness()
  const { t } = useI18n()
  const phone = getPhone()

  function signOut() {
    clearToken()
    router.replace('/welcome')
  }

  if (!business) {
    return (
      <AuthLayout title={t('profile.title')}>
        <LoadingSpinner />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('profile.title')}>
      <div className="max-w-2xl w-full space-y-6">
        {/* Identity */}
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={business.name} size="lg" />
            <div className="min-w-0">
              <p className="text-lg font-bold text-text-1 truncate">
                {business.name}
              </p>
              {business.description && (
                <p className="text-sm text-text-2">{business.description}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Account details */}
        <Card>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <p className="text-base text-text-2">{t('profile.phone')}</p>
              <p className="text-base font-medium text-text-1">{phone ?? '—'}</p>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <p className="text-base text-text-2">{t('profile.plan')}</p>
              <p className="text-base font-medium text-text-1">
                {business.plan ?? 'FREE'}
              </p>
            </div>
            <div className="flex justify-between items-center py-2">
              <p className="text-base text-text-2">{t('settings.telegramBot')}</p>
              <p className="text-base font-medium text-text-1">
                {business.botUsername ? `@${business.botUsername}` : '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* Link to full business settings */}
        <Link href="/settings" className="block">
          <Card className="flex items-center gap-3 hover:bg-surface-2 transition-colors cursor-pointer">
            <Icon name="settings" size={20} className="text-text-2" />
            <span className="flex-1 text-base font-medium text-text-1">
              {t('profile.businessSettings')}
            </span>
            <Icon name="menu" size={18} className="text-text-3" />
          </Card>
        </Link>

        {/* Sign out */}
        <Button variant="secondary" fullWidth leftIcon="logout" onClick={signOut}>
          {t('common.signOut')}
        </Button>
      </div>
    </AuthLayout>
  )
}
