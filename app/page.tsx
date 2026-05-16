"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Eye, EyeOff } from "lucide-react"
import { SeedSpoonLogo } from "@/components/seed-spoon-logo"

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"apple" | "google" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error("Supabase not configured")
    return createClient(url, key)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(authError.message)
      else router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: "apple" | "google") {
    setOauthLoading(provider)
    setError(null)
    try {
      const supabase = getSupabase()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (authError) setError(authError.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed")
    } finally {
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side — form panel */}
      <div className="w-full lg:w-[45%] flex flex-col bg-[#F4F3EF] px-10 py-10 relative">
        {/* Brand badge */}
        <div className="mb-10">
          <div className="inline-block border border-gray-300 rounded-xl px-4 py-2 bg-white shadow-sm">
            <SeedSpoonLogo size="sm" />
          </div>
        </div>

        {/* Form area — vertically centered */}
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <h1 className="text-3xl font-bold text-ss-charcoal mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-8">Access your Seed & Spoon dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@seedandspoon.org"
                required
                className="w-full h-12 px-4 rounded-xl bg-white border border-gray-200 text-ss-charcoal placeholder:text-gray-400 focus:outline-none focus:border-ss-green focus:ring-1 focus:ring-ss-green transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-12 px-4 pr-12 rounded-xl bg-white border border-gray-200 text-ss-charcoal placeholder:text-gray-400 focus:outline-none focus:border-ss-green focus:ring-1 focus:ring-ss-green transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-ss-orange hover:bg-ss-orange-dark text-white font-semibold text-base transition disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in…" : "Submit"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleOAuth("apple")}
              disabled={oauthLoading !== null}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-ss-charcoal text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
            >
              <AppleIcon />
              Apple
            </button>
            <button
              onClick={() => handleOAuth("google")}
              disabled={oauthLoading !== null}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-ss-charcoal text-sm font-medium hover:bg-gray-50 transition disabled:opacity-60"
            >
              <GoogleIcon />
              Google
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-8 mt-auto max-w-sm w-full mx-auto">
          <p className="text-xs text-gray-500">
            New here?{" "}
            <a href="#" className="text-ss-charcoal font-medium hover:underline">
              Request access
            </a>
          </p>
          <a href="#" className="text-xs text-gray-500 hover:underline">
            Terms &amp; Conditions
          </a>
        </div>
      </div>

      {/* Right side — hero panel */}
      <div className="hidden lg:flex lg:w-[55%] green-gradient relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-[30%] right-[10%] w-[200px] h-[200px] rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-12">
            <SeedSpoonLogo variant="light" size="lg" />
            <p className="text-white/70 text-sm mt-1 ml-[52px]">Community Resource Manager</p>
          </div>

          <h2 className="text-5xl font-bold leading-tight mb-6 max-w-lg">
            Feeding the future of New Jersey.
          </h2>
          <p className="text-xl text-white/80 max-w-md leading-relaxed">
            Connecting communities, reducing food insecurity, and empowering volunteers across 5 counties.
          </p>

          <div className="flex gap-8 mt-16">
            <div>
              <p className="text-3xl font-bold">5</p>
              <p className="text-white/70 text-sm">Counties Served</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50K+</p>
              <p className="text-white/70 text-sm">Meals Delivered</p>
            </div>
            <div>
              <p className="text-3xl font-bold">200+</p>
              <p className="text-white/70 text-sm">Active Volunteers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
