import Image from "next/image";
import Link from "next/link";
import { Activity, Heart, Shield, Stethoscope, Microscope, Brain, ArrowRight, Star, Quote } from "lucide-react";
import Hero from "@/components/Hero";
import ServiceCard from "@/components/ServiceCard";

const featuredServices = [
  {
    title: "General Consultation",
    description: "Expert medical advice and treatment for common health issues and preventive care.",
    icon: Stethoscope,
    href: "/services",
  },
  {
    title: "Diagnostic Lab",
    description: "State-of-the-art laboratory services for accurate and timely medical testing.",
    icon: Microscope,
    href: "/services",
  },
  {
    title: "Cardiology",
    description: "Specialized heart care and diagnostics using the latest cardiovascular technology.",
    icon: Heart,
    href: "/services",
  },
  {
    title: "Emergency Care",
    description: "24/7 rapid response for critical medical emergencies and trauma care.",
    icon: Shield,
    href: "/services",
  },
];

const testimonials = [
  {
    name: "Ahmed Mohamed",
    role: "Patient",
    content: "The care I received at Gargaar Hospital was exceptional. The doctors are truly caring and the facilities are top-notch.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&h=100&auto=format&fit=crop",
  },
  {
    name: "Fatima Ali",
    role: "Mother",
    content: "We brought our daughter for pediatric care and was amazed by how friendly and professional the staff were.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&h=100&auto=format&fit=crop",
  },
   {
    name: "Mohamed Omar",
    role: "Patient",
    content: "A truly modern hospital with a vision for the future of healthcare in our country. Highly recommended.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&h=100&auto=format&fit=crop",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-y-20 pb-20">
      <Hero />

      {/* Services Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-wide">Our Expertise</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Comprehensive Medical Services
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            We offer a wide range of specialized medical services tailored to meet your unique healthcare needs.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {featuredServices.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
        <div className="mt-16 flex justify-center">
             <Link href="/services" className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-slate-50 transition-all">
                View All Services <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
      </section>

      {/* About Brief Section */}
      <section className="relative overflow-hidden bg-slate-100 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
            <div className="lg:pr-8">
              <div className="lg:max-w-lg">
                <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase">Why Choose Us?</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Better Health Starts Here</p>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  Gargaar Hospital is committed to excellence in patient care. Our multidisciplinary approach ensures that you receive holistic and personalized treatment from the region's best medical experts.
                </p>
                <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-slate-600 lg:max-w-none">
                  {[
                    { title: "Advanced Technology", description: "Equipped with the latest diagnostic and imaging technology for precise treatments.", icon: Activity },
                    { title: "Compassionate Care", description: "Our staff treats every patient with the dignity, respect, and kindness they deserve.", icon: Heart },
                    { title: "Trusted Experts", description: "Home to highly qualified doctors and specialists with decades of combined experience.", icon: Stethoscope },
                  ].map((feature) => (
                    <div key={feature.title} className="relative pl-9">
                      <dt className="inline font-bold text-slate-900">
                        <feature.icon className="absolute left-1 top-1 h-5 w-5 text-blue-600" aria-hidden="true" />
                        {feature.title}
                      </dt>{" "}
                      <dd className="inline">{feature.description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
             <div className="relative h-[400px] w-full lg:h-full lg:min-h-[600px] overflow-hidden rounded-3xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop"
                  alt="Modern Hospital Interior"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                     <div className="bg-blue-600/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
                             <Quote className="h-8 w-8 text-emerald-400 opacity-50" />
                        </div>
                        <p className="text-xl font-medium leading-relaxed italic mb-6">
                            "Our mission is to provide accessible, high-quality healthcare that empowers our community to lead healthier lives."
                        </p>
                        <div className="h-1 w-20 bg-emerald-400" />
                        <p className="mt-4 font-bold text-lg uppercase tracking-widest text-emerald-400">Gargaar Vision 2030</p>
                     </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-wide">Testimonials</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What Our Patients Say</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="flex flex-col bg-white p-8 rounded-2xl shadow-lg border border-slate-100 italic">
               <div className="flex gap-1 text-yellow-500 mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="text-lg leading-7 text-slate-700 mb-8 select-none">"{testimonial.content}"</p>
              <div className="mt-auto flex items-center gap-x-4">
                <img className="h-12 w-12 rounded-full bg-slate-50 object-cover" src={testimonial.image} alt={testimonial.name} />
                <div className="text-sm leading-6">
                  <p className="font-bold text-slate-900">{testimonial.name}</p>
                  <p className="text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-blue-600 px-6 py-16 shadow-2xl rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
          <svg
            viewBox="0 0 1024 1024"
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
            aria-hidden="true"
          >
            <circle cx={512} cy={512} r={512} fill="url(#759c1415-0410-454c-8f7c-9a820de03641)" fillOpacity="0.7" />
            <defs>
              <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
                <stop stopColor="#7775D6" />
                <stop offset={1} stopColor="#E935C1" />
              </radialGradient>
            </defs>
          </svg>
          <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-32 lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl uppercase tracking-wider">
               Need Urgent Medical Advice?
            </h2>
            <p className="mt-6 text-lg leading-8 text-blue-100">
                 Our specialized teams are ready to help you. Schedule your visit today or call our emergency hotline.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6 lg:justify-start">
              <Link
                href="/appointment"
                className="rounded-full bg-white px-8 py-4 text-sm font-bold text-blue-600 shadow-sm hover:bg-blue-50 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Schedule Appointment
              </Link>
              <a href="tel:+25261000000" className="text-sm font-semibold leading-6 text-white group">
                Contact Us <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>
          <div className="relative mt-16 h-80 lg:mt-8">
            <img
              className="absolute left-0 top-0 w-[57rem] max-w-none rounded-md bg-white/5 ring-1 ring-white/10"
              src="https://plus.unsplash.com/premium_photo-1661601614917-0639e44eb1c4?q=80&w=800&auto=format&fit=crop"
              alt="Hospital Team"
              width={1824}
              height={1080}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
