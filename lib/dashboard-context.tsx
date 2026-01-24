"use client"

import { createContext, useContext } from "react"

export interface DashboardContextValue {
  userRoles: string[]
  userName: string | null
  isLoading: boolean
}

export const DashboardContext = createContext<DashboardContextValue>({
  userRoles: [],
  userName: null,
  isLoading: true,
})

export function useDashboardContext() {
  return useContext(DashboardContext)
}
