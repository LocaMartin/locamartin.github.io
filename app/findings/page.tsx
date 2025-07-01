import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SocialFooter } from "@/components/social-footer"
import { Search, Calendar, Clock, User, Award, ChevronLeft, ChevronRight, Menu } from "lucide-react"

const findings = [
  {
    id: 1,
    title: "SSRF Vulnerability in AWS Metadata Service",
    severity: "Critical",
    target: "example.com",
    date: "March 10, 2023",
    status: "Fixed",
    description:
      "Discovered a Server-Side Request Forgery vulnerability that allowed access to AWS metadata service, potentially exposing IAM credentials.",
  },
  {
    id: 2,
    title: "Stored XSS in User Profile",
    severity: "High",
    target: "webapp.io",
    date: "February 5, 2023",
    status: "Fixed",
    description:
      "Identified a stored Cross-Site Scripting vulnerability in the user profile section that could be used to steal cookies and session information.",
  },
  {
    id: 3,
    title: "SQL Injection in Search Parameter",
    severity: "High",
    target: "searchapp.net",
    date: "January 18, 2023",
    status: "Fixed",
    description:
      "Found a SQL injection vulnerability in the search parameter that could allow an attacker to extract sensitive information from the database.",
  },
  {
    id: 4,
    title: "Authentication Bypass via JWT Manipulation",
    severity: "Critical",
    target: "authservice.com",
    date: "December 7, 2022",
    status: "Fixed",
    description:
      "Discovered a vulnerability in the JWT implementation that allowed authentication bypass by manipulating the token signature.",
  },
  {
    id: 5,
    title: "Open Redirect in Login Flow",
    severity: "Medium",
    target: "loginapp.io",
    date: "November 22, 2022",
    status: "Fixed",
    description:
      "Identified an open redirect vulnerability in the login flow that could be exploited for phishing attacks.",
  },
]

const hallOfFame = [
  {
    name: "Security Researcher 1",
    contributions: "Multiple XSS findings",
    date: "2023",
  },
  {
    name: "Security Researcher 2",
    contributions: "CSRF vulnerability",
    date: "2022",
  },
  {
    name: "Security Researcher 3",
    contributions: "Security improvements",
    date: "2022",
  },
]

export default function FindingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <Link href="/" className="text-blue-400 hover:text-blue-300 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-arrow-left mr-2"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to Home
          </Link>
        </header>

        <main className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Security Findings</h1>

            <div className="hidden md:flex items-center">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search findings..."
                  className="w-64 pl-10 bg-white/10 border-blue-500/30 text-white"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <Button variant="outline" className="md:hidden">
              <Menu size={20} />
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Main findings content */}
            <div className="flex-1">
              <div className="space-y-8">
                {findings.map((finding) => (
                  <Card
                    key={finding.id}
                    className="backdrop-blur-md bg-white/10 border-blue-500/30 border hover:border-blue-400/50 transition-all"
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <Link href={`/findings/${finding.id}`}>
                          <h2 className="text-2xl font-bold text-white hover:text-blue-300 transition-colors">
                            {finding.title}
                          </h2>
                        </Link>

                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            finding.severity === "Critical"
                              ? "bg-red-900/50 text-red-200"
                              : finding.severity === "High"
                                ? "bg-orange-900/50 text-orange-200"
                                : finding.severity === "Medium"
                                  ? "bg-yellow-900/50 text-yellow-200"
                                  : "bg-blue-900/50 text-blue-200"
                          }`}
                        >
                          {finding.severity}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {finding.date}
                        </div>
                        <div className="flex items-center">
                          <User size={14} className="mr-1" />
                          Target: {finding.target}
                        </div>
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          Status: {finding.status}
                        </div>
                      </div>

                      <p className="text-gray-300 mb-4">{finding.description}</p>

                      <div className="flex justify-end">
                        <Link
                          href={`/findings/${finding.id}`}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View details →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between items-center mt-8">
                <Button variant="outline" className="text-gray-300">
                  <ChevronLeft size={16} className="mr-1" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  <Button variant="default" size="sm" className="w-8 h-8 p-0">
                    1
                  </Button>
                  <Button variant="outline" size="sm" className="w-8 h-8 p-0 text-gray-300">
                    2
                  </Button>
                </div>

                <Button variant="outline" className="text-gray-300">
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>

            {/* Sidebar for hall of fame */}
            <div className="md:w-80 shrink-0">
              <Card className="backdrop-blur-md bg-white/10 border-blue-500/30 border sticky top-8">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-6 text-white flex items-center">
                    <Award size={20} className="mr-2 text-yellow-400" />
                    Hall of Fame
                  </h2>

                  <div className="space-y-4">
                    {hallOfFame.map((contributor, index) => (
                      <div key={index} className="border-b border-gray-700 pb-4 last:border-0">
                        <h3 className="font-semibold text-white">{contributor.name}</h3>
                        <p className="text-gray-400 text-sm">{contributor.contributions}</p>
                        <p className="text-gray-500 text-xs">{contributor.date}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <h3 className="font-semibold text-white mb-2">Submit a Finding</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Found a security issue on this website? Let me know and get added to the Hall of Fame!
                    </p>
                    <Button className="w-full">Submit Report</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <SocialFooter />
      </div>
    </div>
  )
}

