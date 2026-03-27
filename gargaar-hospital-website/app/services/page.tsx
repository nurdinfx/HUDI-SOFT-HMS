import { Stethoscope, Activity, Heart, Shield, Microscope, Brain, Zap, Baby, Thermometer, Radio, Droplet, Pill } from "lucide-react";
import ServiceCard from "@/components/ServiceCard";
import Link from "next/link";

const allServices = [
  { title: "General Consultation", description: "Comprehensive check-ups and medical advice for all age groups.", icon: Stethoscope, href: "/appointment" },
  { title: "Pediatrics", description: "Specialized healthcare and support for infants, children, and adolescents.", icon: Baby, href: "/appointment" },
  { title: "Cardiology", description: "Expert heart care, diagnostics, and cardiovascular treatments.", icon: Heart, href: "/appointment" },
  { title: "Emergency Care", description: "24/7 rapid response and trauma services for critical emergencies.", icon: Shield, href: "/appointment" },
  { title: "Neurology", description: "Advanced diagnosis and treatment for brain and nervous system disorders.", icon: Brain, href: "/appointment" },
  { title: "Laboratory", description: "Modern laboratory for precise blood tests, pathology, and diagnostics.", icon: Microscope, href: "/appointment" },
  { title: "Diagnostics & Imaging", description: "High-quality X-rays, Ultrasounds, and CT scans for accurate diagnosis.", icon: Radio, href: "/appointment" },
  { title: "Internal Medicine", description: "Specialized care for chronic and complex adult medical conditions.", icon: Activity, href: "/appointment" },
  { title: "Urgencies", description: "Quick care for non-life-threatening urgent medical situations.", icon: Zap, href: "/appointment" },
  { title: "Maternity", description: "Compassionate care for expecting mothers and their newborns.", icon: Heart, href: "/appointment" },
  { title: "Pharmacy", description: "On-site pharmacy with a wide range of authentic medical supplies.", icon: Pill, href: "/appointment" },
  { title: "Vaccinations", description: "Essential immunizations for children and travel-related vaccines.", icon: Droplet, href: "/appointment" },
];

export default function ServicesPage() {
  return (
    <div className="flex flex-col gap-y-16 py-12">
      {/* Header Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest">Our Expertise</h2>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Healthcare <span className="text-blue-600">Services</span>
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
             We provide a wide range of specialized healthcare services with a focus on quality, care, and accessibility.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-12">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {allServices.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-12">
        <div className="relative isolate overflow-hidden bg-slate-900 px-6 py-16 shadow-2xl rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
          <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
               Don't See What You're Looking For?
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
               Contact us today to inquire about specific services or to schedule a consultation with our experts.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
              <Link
                href="/contact"
                className="rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-sm hover:bg-blue-500 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Contact Us
              </Link>
              <Link href="/appointment" className="text-sm font-semibold leading-6 text-white group">
                Book Appointment <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
          <div className="relative mt-16 h-80 lg:mt-8">
            <img
              className="absolute left-0 top-0 w-[57rem] max-w-none rounded-md bg-white/5 ring-1 ring-white/10"
              src="https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=800&auto=format&fit=crop"
              alt="Medical Consultation"
              width={1824}
              height={1080}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
