import Link from "next/link"
import Image from "next/image"
import { ProjectCards } from "@/components/project-cards"
import { SkillCards } from "@/components/skill-cards"
import { SocialFooter } from "@/components/social-footer"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackgroundText } from "@/components/background-text"

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
      <BackgroundText />

      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center">
            <div className="w-12 h-12 relative mr-4">
              <Image
                src="/placeholder.svg?height=48&width=48"
                alt="Logo"
                width={48}
                height={48}
                className="rounded-full"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">Loca Martin</h1>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <NavLink href="/" label="Home" />
            <NavLink href="/blog" label="Blog" />
            <NavLink href="/about" label="About" />
            <NavLink href="/findings" label="Findings" />
            <NavLink href="/admin" label="Admin" />
            <ThemeToggle />
          </nav>

          <div className="md:hidden">
            <button className="text-white p-2">
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
                className="lucide lucide-menu"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <main className="relative z-10">
          <section className="mb-20 text-center">
            <div className="max-w-3xl mx-auto mb-12 backdrop-blur-sm bg-white/10 p-8 rounded-2xl shadow-xl">
              <h2 className="text-4xl font-bold mb-6 text-white">
                <span className="block">Security Researcher & Developer</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 italic">"Because in truth I am that monster"</p>
              <div className="flex justify-center">
                <Link
                  href="/about"
                  className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
                >
                  Discover More
                </Link>
              </div>
            </div>

            <div className="relative mt-24 mb-32">
              <div className="absolute left-1/2 transform -translate-x-1/2 -top-24 w-48 h-48">
                <Image
                  src="/placeholder.svg?height=192&width=192"
                  alt="L Lawliet"
                  width={192}
                  height={192}
                  className="rounded-full border-4 border-blue-500"
                />
              </div>
              <ProjectCards />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-bold mb-10 text-center text-white">Skills & Achievements</h2>
            <SkillCards />
          </section>
        </main>

        <SocialFooter />
      </div>
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all transform hover:-translate-y-1 active:translate-y-0"
    >
      {label}
    </Link>
  )
}

