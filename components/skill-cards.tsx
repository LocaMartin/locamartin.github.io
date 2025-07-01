import { Card, CardContent } from "@/components/ui/card"
import { Shield, Code, Server, Database, Search, Lock, Network, Terminal, Globe, Cpu } from "lucide-react"

const skills = [
  {
    icon: <Shield className="h-8 w-8 text-blue-400" />,
    name: "Penetration Testing",
    level: 90,
  },
  {
    icon: <Code className="h-8 w-8 text-blue-400" />,
    name: "Web Development",
    level: 85,
  },
  {
    icon: <Server className="h-8 w-8 text-blue-400" />,
    name: "Server Security",
    level: 80,
  },
  {
    icon: <Database className="h-8 w-8 text-blue-400" />,
    name: "Database Security",
    level: 75,
  },
  {
    icon: <Search className="h-8 w-8 text-blue-400" />,
    name: "Vulnerability Research",
    level: 95,
  },
  {
    icon: <Lock className="h-8 w-8 text-blue-400" />,
    name: "Cryptography",
    level: 70,
  },
  {
    icon: <Network className="h-8 w-8 text-blue-400" />,
    name: "Network Security",
    level: 85,
  },
  {
    icon: <Terminal className="h-8 w-8 text-blue-400" />,
    name: "Command Line",
    level: 90,
  },
  {
    icon: <Globe className="h-8 w-8 text-blue-400" />,
    name: "OSINT",
    level: 80,
  },
  {
    icon: <Cpu className="h-8 w-8 text-blue-400" />,
    name: "Reverse Engineering",
    level: 75,
  },
]

export function SkillCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {skills.map((skill, index) => (
        <Card
          key={index}
          className="backdrop-blur-md bg-white/5 border-blue-900/30 border hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 z-0"></div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 transform rotate-45 translate-x-8 -translate-y-8"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-500/10 transform rotate-45 -translate-x-8 translate-y-8"></div>

          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 rounded-lg bg-blue-900/30">{skill.icon}</div>
              <h3 className="text-lg font-bold mb-2 text-white">{skill.name}</h3>
              <div className="w-full bg-gray-700/50 rounded-full h-2.5 mb-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full"
                  style={{ width: `${skill.level}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-300">{skill.level}%</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

