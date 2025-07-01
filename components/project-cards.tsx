"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Github, ExternalLink } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

const projects = [
  {
    id: 1,
    title: "Security Scanner",
    description: "An automated tool for vulnerability detection in web applications",
    tags: ["TypeScript", "Node.js", "Security"],
    github: "https://github.com/username/security-scanner",
    demo: "https://security-scanner-demo.vercel.app",
  },
  {
    id: 2,
    title: "Bug Bounty Dashboard",
    description: "Track and manage bug bounty submissions across platforms",
    tags: ["React", "Next.js", "API"],
    github: "https://github.com/username/bug-bounty-dashboard",
    demo: "https://bug-bounty-dashboard.vercel.app",
  },
  {
    id: 3,
    title: "Exploit Library",
    description: "Collection of proof-of-concept exploits for educational purposes",
    tags: ["Python", "Security", "Research"],
    github: "https://github.com/username/exploit-library",
    demo: null,
  },
  {
    id: 4,
    title: "Network Traffic Analyzer",
    description: "Real-time analysis of network traffic for security monitoring",
    tags: ["Go", "Networking", "Security"],
    github: "https://github.com/username/network-analyzer",
    demo: "https://network-analyzer-demo.vercel.app",
  },
  {
    id: 5,
    title: "Secure Authentication",
    description: "Implementation of secure authentication methods with MFA",
    tags: ["JavaScript", "Auth", "Security"],
    github: "https://github.com/username/secure-auth",
    demo: "https://secure-auth-demo.vercel.app",
  },
]

export function ProjectCards() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360)
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-[500px] w-full">
      {projects.map((project, index) => {
        // Calculate position in the circle
        const angle = (rotation + index * (360 / projects.length)) % 360
        const radian = (angle * Math.PI) / 180
        const radius = 200 // Circle radius

        // Calculate x and y position
        const x = Math.cos(radian) * radius
        const y = Math.sin(radian) * radius

        // Calculate z-index based on y position (items in front appear on top)
        const zIndex = Math.round(50 - y)

        // Calculate scale based on y position (items in front appear larger)
        const scale = 0.8 + ((y + radius) / (radius * 2)) * 0.4

        return (
          <div
            key={project.id}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`,
              zIndex,
              opacity: 0.5 + ((y + radius) / (radius * 2)) * 0.5,
            }}
          >
            <Card className="w-64 h-64 backdrop-blur-md bg-white/10 border-blue-500/30 border hover:border-blue-400 transition-all hover:shadow-lg hover:shadow-blue-500/20">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2 text-white">{project.title}</h3>
                <p className="text-gray-300 text-sm mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-blue-900/50 text-blue-200 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between p-4 pt-0">
                <Link
                  href={project.github}
                  className="text-gray-300 hover:text-white transition-colors"
                  target="_blank"
                >
                  <Github size={20} />
                </Link>
                {project.demo && (
                  <Link
                    href={project.demo}
                    className="text-gray-300 hover:text-white transition-colors"
                    target="_blank"
                  >
                    <ExternalLink size={20} />
                  </Link>
                )}
              </CardFooter>
            </Card>
          </div>
        )
      })}
    </div>
  )
}

