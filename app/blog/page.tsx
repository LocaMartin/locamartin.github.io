import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SocialFooter } from "@/components/social-footer"
import { Search, Calendar, Clock, User, MessageSquare, ChevronLeft, ChevronRight, Download, Menu } from "lucide-react"

const blogPosts = [
  {
    id: 1,
    title: "Exploiting SSRF Vulnerabilities in Modern Web Applications",
    excerpt:
      "A deep dive into Server-Side Request Forgery vulnerabilities and how they can be exploited in modern web applications.",
    date: "March 15, 2023",
    readTime: "8 min read",
    author: "Loca Martin",
    comments: 12,
    tags: ["Security", "SSRF", "Web Security"],
  },
  {
    id: 2,
    title: "Understanding Cross-Site Scripting (XSS) Attack Vectors",
    excerpt:
      "An exploration of different XSS attack vectors and how to protect your applications from these common vulnerabilities.",
    date: "February 28, 2023",
    readTime: "6 min read",
    author: "Loca Martin",
    comments: 8,
    tags: ["Security", "XSS", "JavaScript"],
  },
  {
    id: 3,
    title: "Secure Authentication Patterns for Modern Applications",
    excerpt:
      "Best practices for implementing secure authentication in web applications, including multi-factor authentication and passkeys.",
    date: "January 20, 2023",
    readTime: "10 min read",
    author: "Loca Martin",
    comments: 15,
    tags: ["Security", "Authentication", "MFA"],
  },
  {
    id: 4,
    title: "The Art of Responsible Disclosure",
    excerpt:
      "A guide to ethically disclosing security vulnerabilities to organizations and navigating bug bounty programs.",
    date: "December 12, 2022",
    readTime: "7 min read",
    author: "Loca Martin",
    comments: 9,
    tags: ["Security", "Bug Bounty", "Ethics"],
  },
  {
    id: 5,
    title: "Building Secure APIs with Next.js",
    excerpt:
      "Learn how to create secure API endpoints in Next.js applications and protect them from common vulnerabilities.",
    date: "November 5, 2022",
    readTime: "9 min read",
    author: "Loca Martin",
    comments: 11,
    tags: ["Next.js", "API", "Security"],
  },
]

export default function BlogPage() {
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
            <h1 className="text-4xl font-bold text-white">Blog</h1>

            <div className="hidden md:flex items-center">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search posts..."
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
            {/* Sidebar for blog categories/tags - visible on larger screens */}
            <div className="hidden md:block w-64 shrink-0">
              <Card className="backdrop-blur-md bg-white/10 border-blue-500/30 border sticky top-8">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4 text-white">Categories</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-gray-300 hover:text-white block py-1">
                        All Posts
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-gray-300 hover:text-white block py-1">
                        Security
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-gray-300 hover:text-white block py-1">
                        Web Development
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-gray-300 hover:text-white block py-1">
                        Bug Bounty
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-gray-300 hover:text-white block py-1">
                        Tutorials
                      </Link>
                    </li>
                  </ul>

                  <h2 className="text-xl font-bold mt-8 mb-4 text-white">Popular Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="#"
                      className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full hover:bg-blue-800/50"
                    >
                      Security
                    </Link>
                    <Link
                      href="#"
                      className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full hover:bg-blue-800/50"
                    >
                      XSS
                    </Link>
                    <Link
                      href="#"
                      className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full hover:bg-blue-800/50"
                    >
                      SSRF
                    </Link>
                    <Link
                      href="#"
                      className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full hover:bg-blue-800/50"
                    >
                      API
                    </Link>
                    <Link
                      href="#"
                      className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full hover:bg-blue-800/50"
                    >
                      Next.js
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main blog content */}
            <div className="flex-1">
              <div className="space-y-8">
                {blogPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="backdrop-blur-md bg-white/10 border-blue-500/30 border hover:border-blue-400/50 transition-all"
                  >
                    <CardContent className="p-6">
                      <Link href={`/blog/${post.id}`}>
                        <h2 className="text-2xl font-bold mb-3 text-white hover:text-blue-300 transition-colors">
                          {post.title}
                        </h2>
                      </Link>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {post.date}
                        </div>
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          {post.readTime}
                        </div>
                        <div className="flex items-center">
                          <User size={14} className="mr-1" />
                          {post.author}
                        </div>
                        <div className="flex items-center">
                          <MessageSquare size={14} className="mr-1" />
                          {post.comments} comments
                        </div>
                      </div>

                      <p className="text-gray-300 mb-4">{post.excerpt}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag) => (
                          <span key={tag} className="px-3 py-1 bg-blue-900/50 text-blue-200 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex justify-between items-center">
                        <Link href={`/blog/${post.id}`} className="text-blue-400 hover:text-blue-300 transition-colors">
                          Read more →
                        </Link>

                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <Download size={16} className="mr-1" />
                          PDF
                        </Button>
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
                  <Button variant="outline" size="sm" className="w-8 h-8 p-0 text-gray-300">
                    3
                  </Button>
                </div>

                <Button variant="outline" className="text-gray-300">
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </main>

        <SocialFooter />
      </div>
    </div>
  )
}

