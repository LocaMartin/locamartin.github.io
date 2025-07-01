"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LayoutDashboard, FileEdit, MessageSquare, Mail, Settings, LogOut, Lock, KeyRound } from "lucide-react"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would validate credentials against a backend
    if (username === "admin" && password === "password") {
      setIsAuthenticated(true)
    } else {
      alert("Invalid credentials")
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Card className="w-full max-w-md backdrop-blur-md bg-white/10 border-blue-500/30 border">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <Lock className="w-12 h-12 mx-auto mb-4 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Admin Login</h1>
              <p className="text-gray-400">Please authenticate to access the admin panel</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-300">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/10 border-blue-500/30 text-white"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/10 border-blue-500/30 text-white"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <KeyRound className="w-4 h-4 mr-2 text-blue-400" />
                  <span className="text-sm text-gray-300">Use Microsoft Authenticator</span>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
                Return to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-gray-800 p-4 hidden md:block">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-gray-400">Welcome, Loca Martin</p>
        </div>

        <nav className="space-y-2">
          <SidebarLink icon={<LayoutDashboard size={18} />} label="Analytics" active />
          <SidebarLink icon={<FileEdit size={18} />} label="Editor" />
          <SidebarLink icon={<MessageSquare size={18} />} label="Comments" />
          <SidebarLink icon={<Mail size={18} />} label="Mail Box" />
          <SidebarLink icon={<Settings size={18} />} label="Settings" />
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="outline"
            className="w-full justify-start text-gray-400"
            onClick={() => setIsAuthenticated(false)}
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400">Monitor your website performance and traffic</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Visitors" value="12,345" change="+12%" />
          <StatCard title="Page Views" value="45,678" change="+8%" />
          <StatCard title="Avg. Session" value="2m 34s" change="-3%" negative />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur-md bg-white/10 border-blue-500/30 border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 text-white">Traffic Overview</h2>
              <div className="h-64 flex items-center justify-center border border-gray-700 rounded-lg">
                <p className="text-gray-400">Traffic chart would be displayed here</p>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-blue-500/30 border">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 text-white">Top Pages</h2>
              <div className="space-y-4">
                <PageRow page="/" views="4,321" />
                <PageRow page="/blog" views="2,543" />
                <PageRow page="/findings" views="1,876" />
                <PageRow page="/about" views="954" />
                <PageRow page="/blog/1" views="732" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      href="#"
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
        active ? "bg-blue-900/50 text-blue-200" : "text-gray-400 hover:bg-slate-800 hover:text-gray-200"
      }`}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </Link>
  )
}

function StatCard({
  title,
  value,
  change,
  negative = false,
}: { title: string; value: string; change: string; negative?: boolean }) {
  return (
    <Card className="backdrop-blur-md bg-white/10 border-blue-500/30 border">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className={`text-sm font-medium ${negative ? "text-red-400" : "text-green-400"}`}>{change}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function PageRow({ page, views }: { page: string; views: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
      <span className="text-gray-300">{page}</span>
      <span className="text-gray-400">{views} views</span>
    </div>
  )
}

