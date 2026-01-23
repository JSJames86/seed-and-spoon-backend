import {
  Home,
  Heart,
  Users,
  Briefcase,
  Gavel,
  ClipboardList,
  type LucideIcon,
} from "lucide-react"

export type UserRole =
  | "admin"
  | "client"
  | "donor"
  | "volunteer"
  | "employee"
  | "board_member"
  | "executive_director"

export interface RoleConfig {
  label: string
  description: string
  icon: LucideIcon
  href: string
  welcomeMessage: string
  firstLoginSteps: { title: string; description: string; href?: string }[]
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  admin: {
    label: "Administrator",
    description: "Full system access and configuration",
    icon: ClipboardList,
    href: "/dashboard/admin",
    welcomeMessage: "Manage the entire Seed & Spoon system.",
    firstLoginSteps: [
      { title: "Review roles", description: "Check that role assignments are configured correctly", href: "/dashboard/admin" },
      { title: "Set up programs", description: "Create programs for clients to enroll in", href: "/dashboard/admin" },
      { title: "Check database", description: "Verify data integrity across tables", href: "/dashboard/database" },
    ],
  },
  client: {
    label: "Client",
    description: "Access your household and program information",
    icon: Home,
    href: "/dashboard/client",
    welcomeMessage: "Manage your household, view enrolled programs, and submit reports.",
    firstLoginSteps: [
      { title: "Set up your household", description: "Add your address, phone, and delivery preferences" },
      { title: "Browse programs", description: "See what food assistance programs are available to you" },
      { title: "Add household members", description: "Add family members to your household for accurate service" },
    ],
  },
  donor: {
    label: "Donor",
    description: "Track your contributions and impact",
    icon: Heart,
    href: "/dashboard/donor",
    welcomeMessage: "Track donations, manage recurring gifts, and download tax receipts.",
    firstLoginSteps: [
      { title: "Make your first donation", description: "Support Seed & Spoon with a one-time or recurring contribution" },
      { title: "Set up recurring giving", description: "Provide consistent support with automatic monthly donations" },
      { title: "View your impact", description: "See how your contributions help families in need" },
    ],
  },
  volunteer: {
    label: "Volunteer",
    description: "Find shifts and track your hours",
    icon: Users,
    href: "/dashboard/volunteer",
    welcomeMessage: "Sign up for shifts, track hours, and connect with your volunteer group.",
    firstLoginSteps: [
      { title: "Browse available shifts", description: "Find volunteer opportunities that match your schedule" },
      { title: "Sign up for a shift", description: "Reserve your spot at an upcoming event" },
      { title: "Join a group", description: "Connect with your organization's volunteer team" },
    ],
  },
  employee: {
    label: "Employee",
    description: "View your schedule, trainings, and documents",
    icon: Briefcase,
    href: "/dashboard/employee",
    welcomeMessage: "Access your schedule, complete required trainings, and view company documents.",
    firstLoginSteps: [
      { title: "Review your info", description: "Verify your employee details are correct" },
      { title: "Check your schedule", description: "See your upcoming work shifts" },
      { title: "Complete trainings", description: "Finish any required training modules" },
    ],
  },
  board_member: {
    label: "Board Member",
    description: "Access meetings, agendas, and governance documents",
    icon: Gavel,
    href: "/dashboard/board",
    welcomeMessage: "View upcoming meetings, review agendas, and access governance policies.",
    firstLoginSteps: [
      { title: "Check upcoming meetings", description: "See when the next board meeting is scheduled" },
      { title: "Review policies", description: "Familiarize yourself with current bylaws and policies" },
      { title: "Prepare for meetings", description: "Review agendas and supporting materials" },
    ],
  },
  executive_director: {
    label: "Executive Director",
    description: "Full organizational visibility and oversight",
    icon: ClipboardList,
    href: "/dashboard/director",
    welcomeMessage: "Monitor programs, staff, volunteers, and financials across the organization.",
    firstLoginSteps: [
      { title: "Review dashboard metrics", description: "See key organizational health indicators" },
      { title: "Check program status", description: "Monitor active programs and enrollment" },
      { title: "Review staff overview", description: "See active employees and departments" },
    ],
  },
}

/** Get the primary role for a user (first in priority order) */
export function getPrimaryRole(roles: string[]): UserRole | null {
  const priority: UserRole[] = [
    "executive_director",
    "admin",
    "board_member",
    "employee",
    "volunteer",
    "donor",
    "client",
  ]
  for (const role of priority) {
    if (roles.includes(role)) return role
  }
  return null
}
