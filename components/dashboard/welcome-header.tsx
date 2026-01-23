"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ROLE_CONFIG, type UserRole } from "@/lib/dashboard-config"
import { ArrowRight, Lightbulb } from "lucide-react"
import Link from "next/link"

interface WelcomeHeaderProps {
  role: UserRole
  isFirstLogin?: boolean
  userName?: string
}

export function WelcomeHeader({ role, isFirstLogin, userName }: WelcomeHeaderProps) {
  const config = ROLE_CONFIG[role]
  if (!config) return null

  if (!isFirstLogin) return null

  return (
    <Alert className="bg-primary/5 border-primary/20">
      <Lightbulb className="h-4 w-4 text-primary" />
      <AlertTitle>Welcome to Seed & Spoon{userName ? `, ${userName}` : ''}!</AlertTitle>
      <AlertDescription className="mt-1">
        {config.welcomeMessage}
      </AlertDescription>
    </Alert>
  )
}

interface GettingStartedProps {
  role: UserRole
  completedSteps?: number[]
}

export function GettingStarted({ role, completedSteps = [] }: GettingStartedProps) {
  const config = ROLE_CONFIG[role]
  if (!config) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Getting Started</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {config.firstLoginSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(index)
            return (
              <div
                key={index}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  isCompleted ? 'bg-muted/50 opacity-60' : 'bg-background'
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                {step.href && !isCompleted && (
                  <Link href={step.href}>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
