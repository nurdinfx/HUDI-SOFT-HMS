import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, ArrowRight } from "lucide-react";

const navigation = {
  main: [
    { name: "About Us", href: "/about" },
    { name: "Our Services", href: "/services" },
    { name: "Departments", href: "/departments" },
    { name: "Find a Doctor", href: "/doctors" },
    { name: "Contact Us", href: "/contact" },
  ],
  services: [
    { name: "Emergency Care", href: "/services#emergency" },
    { name: "Pediatrics", href: "/services#pediatrics" },
    { name: "Cardiology", href: "/services#cardiology" },
    { name: "Laboratory", href: "/services#laboratory" },
    { name: "Surgery", href: "/services#surgery" },
  ],
  social: [
    { name: "Facebook", icon: Facebook, href: "https://facebook.com" },
    { name: "Twitter", icon: Twitter, href: "https://twitter.com" },
    { name: "Instagram", icon: Instagram, href: "https://instagram.com" },
    { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 lg:px-8 lg:pt-24">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
             <Link href="/" className="flex items-center gap-2">
                <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-blue-600 flex items-center justify-center">
                  <Image
                    src="/images/logo.png"
                    alt="Gargaar Hospital"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">
                  Gargaar <span className="text-emerald-500">Hospital</span>
                </span>
              </Link>
            <p className="text-sm leading-6 text-slate-300 max-w-sm">
                Dedicated to providing word-class healthcare with a human touch. Your health is our priority, every single day.
            </p>
            <div className="flex space-x-6">
              {navigation.social.map((item) => (
                <a key={item.name} href={item.href} className="text-slate-400 hover:text-white transition-colors">
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">Quick Links</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.main.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="group flex items-center text-sm leading-6 text-slate-300 hover:text-emerald-400 transition-colors">
                        <ArrowRight className="h-4 w-4 mr-2 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">Services</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.services.map((item) => (
                    <li key={item.name}>
                       <Link href={item.href} className="group flex items-center text-sm leading-6 text-slate-300 hover:text-emerald-400 transition-colors">
                        <ArrowRight className="h-4 w-4 mr-2 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-1 md:gap-8">
              <div>
                <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">Contact Info</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li className="flex gap-x-3">
                    <MapPin className="h-6 w-5 flex-none text-emerald-500" aria-hidden="true" />
                    <span className="text-sm leading-6 text-slate-300">KM-4, Mogadishu, Somalia</span>
                  </li>
                  <li className="flex gap-x-3">
                    <Phone className="h-6 w-5 flex-none text-emerald-500" aria-hidden="true" />
                    <span className="text-sm leading-6 text-slate-300">+252 61 000 000</span>
                  </li>
                  <li className="flex gap-x-3">
                    <Mail className="h-6 w-5 flex-none text-emerald-500" aria-hidden="true" />
                    <span className="text-sm leading-6 text-slate-300">contact@gargaarhospital.com</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-slate-700/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs leading-5 text-slate-400">
            &copy; {new Date().getFullYear()} Gargaar Hospital. All rights reserved.
          </p>
          <div className="flex gap-x-8">
             <Link href="/privacy" className="text-xs text-slate-400 hover:text-white">Privacy Policy</Link>
             <Link href="/terms" className="text-xs text-slate-400 hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
