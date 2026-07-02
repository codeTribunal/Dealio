'use client'
import { useEffect } from 'react'
import { DealioMark } from '@/components/icons/DealioMark'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { useI18n } from '@/lib/i18n/i18nContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function WelcomePage() {
  const router = useRouter()
  const { t } = useI18n()

  // A returning user with a live token never needs the arrival screen.
  useEffect(() => {
    if (isAuthenticated()) router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 640px 420px at 50% 40%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%)',
        }}
      />

      <Card padded={false} className="relative w-full max-w-md shadow-lg p-8 sm:p-10">
        <div className="flex items-center justify-between mb-8">
          <DealioMark size={44} className="flex-shrink-0" />
          <LanguageSwitcher />
        </div>

        <h1
          className="text-text-1"
          style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-extra)', lineHeight: 1.1 }}
        >
          {t('welcome.title')}
        </h1>
        <p className="text-base text-text-2 mt-2 mb-8">{t('welcome.subtitle')}</p>

        <div className="space-y-3">
          <Button variant="primary" fullWidth onClick={() => router.push('/login')}>
            {t('welcome.logIn')}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => router.push('/onboarding')}>
            {t('welcome.signUp')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
