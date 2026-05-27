'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { requestOtp, verifyOtp } from '@/lib/api'
import { setToken } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode() {
    setLoading(true)
    setError(null)
    try {
      await requestOtp(phone)
      setStep('otp')
    } catch {
      setError('Failed to send code. Check your number.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setLoading(true)
    setError(null)
    try {
      const data = await verifyOtp(phone, code)
      setToken(data.token)
      router.replace('/customers')
    } catch {
      setError('Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10 w-full max-w-md mx-4 md:mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>

        {step === 'phone' ? (
          <>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Enter your phone number to continue
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              type="tel"
              placeholder="+998901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendCode()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <button
              onClick={handleSendCode}
              disabled={loading || !phone}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Enter the 6-digit code sent to {phone}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerify()}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={loading || !code}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              onClick={() => {
                setStep('phone')
                setCode('')
                setError(null)
              }}
              className="w-full mt-3 text-sm text-blue-600"
            >
              ← Change number
            </button>
          </>
        )}
      </div>
    </div>
  )
}
