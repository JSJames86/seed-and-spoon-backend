"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SeedSpoonLogo } from "@/components/seed-spoon-logo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase not configured")
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Green Gradient Hero (60%) */}
      <div className="hidden lg:flex lg:w-[60%] green-gradient relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/5" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-[30%] right-[10%] w-[200px] h-[200px] rounded-full bg-white/5" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          {/* Logo */}
          <div className="mb-12">
            <SeedSpoonLogo variant="light" size="lg" />
            <p className="text-white/70 text-sm mt-1 ml-[52px]">Community Resource Manager</p>
          </div>

          {/* Heading */}
          <h1 className="text-5xl font-bold leading-tight mb-6 max-w-lg">
            Feeding the future of New Jersey.
          </h1>
          <p className="text-xl text-white/80 max-w-md leading-relaxed">
            Connecting communities, reducing food insecurity, and empowering volunteers across 5 counties.
          </p>

          {/* Stats */}
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

      {/* Right Side - Login Form (40%) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <SeedSpoonLogo size="md" />
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm rounded-bento">
            <CardHeader className="space-y-1 pb-6">
              <h2 className="text-2xl font-bold text-ss-charcoal">Welcome back</h2>
              <p className="text-muted-foreground text-sm">
                Sign in to your CRM dashboard
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-ss-charcoal font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@seedandspoon.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 rounded-xl border-gray-200 focus:border-ss-green focus:ring-ss-green"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-ss-charcoal font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl border-gray-200 focus:border-ss-green focus:ring-ss-green"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="keep-signed-in"
                      checked={keepSignedIn}
                      onCheckedChange={setKeepSignedIn}
                      className="data-[state=checked]:bg-ss-green"
                    />
                    <Label htmlFor="keep-signed-in" className="text-sm text-muted-foreground cursor-pointer">
                      Keep me signed in
                    </Label>
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-ss-orange hover:bg-ss-orange-dark text-white font-semibold text-base"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Login"}
                </Button>

                <div className="text-center">
                  <a
                    href="#"
                    className="text-sm text-ss-charcoal hover:underline font-medium"
                  >
                    Forgot Password?
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
