'use client'

import { login, signup } from './actions'
import { useState } from 'react'
import { Zap, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)
    
    // We'll use the 'action' attribute on the form for the actual submission,
    // this handler is just for loading state. 
    // Wait, with server actions we can just call them.
    // Let's wrap it to handle client-side loading/error state better.
  }

  // We need to use `useActionState` or similar in React 19, or just simple wrapper.
  // For simplicity with server actions, we can just bind.
  // But to get the error back, we'll wrap the server action in a client handler.

  const handleLogin = async (formData: FormData) => {
    setIsLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
    // If success, it redirects, so no need to set loading false
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-2xl">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-lg flex items-center justify-center mb-4 shadow-[var(--shadow-glow-green)]">
            <Zap size={24} color="white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ElectriGo</h1>
          <p className="text-[var(--text-muted)] mt-1">Sign in to your dashboard</p>
        </div>

        <form action={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
              placeholder="admin@electrigo.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-lg font-medium transition-all shadow-[var(--shadow-glow-green)] disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Don't have an account?{' '}
            <button className="text-[var(--brand-secondary)] hover:underline">
              Contact Admin
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
