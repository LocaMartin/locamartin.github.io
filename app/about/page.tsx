import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { SocialFooter } from "@/components/social-footer"

export default function AboutPage() {
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
          <h1 className="text-4xl font-bold mb-12 text-center text-white">About</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <Card className="backdrop-blur-md bg-white/10 border-blue-500/30 border">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-white">About Me</h2>

                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  <div className="w-32 h-32 mx-auto md:mx-0">
                    <Image
                      src="/placeholder.svg?height=128&width=128"
                      alt="Profile"
                      width={128}
                      height={128}
                      className="rounded-full border-2 border-blue-500"
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Loca Martin</h3>
                    <p className="text-gray-300 mb-4">Security Researcher & Developer</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full">
                        Penetration Testing
                      </span>
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full">Web Security</span>
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm rounded-full">Bug Bounty</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-gray-300">
                  <p>
                    I am a passionate security researcher and developer with expertise in identifying and exploiting
                    vulnerabilities in web applications. With a background in both offensive and defensive security, I
                    bring a unique perspective to the cybersecurity landscape.
                  </p>
                  <p>
                    My journey began with a fascination for understanding how systems work and evolved into a career
                    dedicated to making the digital world more secure. I actively participate in bug bounty programs and
                    contribute to open-source security tools.
                  </p>
                  <p className="italic text-blue-300">
                    "Because in truth I am that monster" - This quote reminds me that to defend against threats, one
                    must understand how attackers think and operate.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/10 border-blue-500/30 border">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6 text-white">About This Website</h2>

                <div className="space-y-4 text-gray-300">
                  <p>
                    This portfolio and blog website was created to showcase my projects, share knowledge through blog
                    posts, and document my security findings. The design is inspired by the character L Lawliet from
                    Death Note, reflecting my analytical approach to problem-solving.
                  </p>

                  <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Technologies Used</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Next.js for the frontend framework</li>
                    <li>Tailwind CSS for styling</li>
                    <li>Glassmorphism design principles</li>
                    <li>GitHub Pages for hosting</li>
                    <li>GitHub Actions for CI/CD</li>
                    <li>Markdown for blog content</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Features</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Responsive design for all devices</li>
                    <li>Dark mode support</li>
                    <li>Blog with markdown support</li>
                    <li>Security findings documentation</li>
                    <li>Project showcase</li>
                    <li>Admin panel for content management</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <SocialFooter />
      </div>
    </div>
  )
}

