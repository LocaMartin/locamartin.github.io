import type React from "react"
import Link from "next/link"
import { Github, Linkedin, MessageSquare, Award, Mail } from "lucide-react"

export function SocialFooter() {
  return (
    <footer className="mt-20 py-8 border-t border-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-6 md:mb-0">
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Loca Martin. All rights reserved.</p>
        </div>

        <div className="flex space-x-6">
          <SocialLink href="https://github.com/" icon={<Github size={20} />} label="GitHub" />
          <SocialLink href="https://linkedin.com/" icon={<Linkedin size={20} />} label="LinkedIn" />
          <SocialLink href="https://t.me/" icon={<MessageSquare size={20} />} label="Telegram" />
          <SocialLink href="https://hackerone.com/" icon={<Award size={20} />} label="HackerOne" />
          <SocialLink href="mailto:contact@example.com" icon={<Mail size={20} />} label="Email" />
        </div>
      </div>
    </footer>
  )
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="text-gray-400 hover:text-white transition-colors transform hover:scale-110 active:scale-95"
      target="_blank"
      aria-label={label}
    >
      {icon}
    </Link>
  )
}

