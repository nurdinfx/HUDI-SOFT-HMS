import Image from "next/image";
import { CheckCircle2, Target, Eye, Award, Users, Crosshair } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-y-16 py-12">
      {/* Header Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest">About Us</h2>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Gargaar Hospital <span className="text-blue-600">Overview</span>
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Founded with a vision to revolutionize healthcare, Gargaar Hospital has grown into a leading institution dedicated to providing comprehensive, patient-centered medical services.
          </p>
        </div>
      </section>

      {/* Main Content with Image */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative h-[400px] overflow-hidden rounded-3xl shadow-2xl">
             <Image
                src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop"
                alt="Hospital Facility"
                fill
                className="object-cover"
              />
          </div>
          <div className="space-y-6 text-slate-600">
            <h3 className="text-2xl font-bold text-slate-900">A Tradition of Excellence</h3>
            <p className="text-lg leading-relaxed">
              At Gargaar Hospital, we believe that health is the foundation of a prosperous life. Our facility is equipped with state-of-the-art medical technology handled by some of the most experienced professionals in the country.
            </p>
            <p className="text-lg leading-relaxed">
              We specialize in a multidisciplinary approach to medicine, ensuring that every patient receives a holistic treatment plan tailored to their specific needs. From routine check-ups to complex surgical procedures, our commitment to excellence never wavers.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4">
               {[
                 "24/7 Emergency Response",
                 "Advanced Diagnostic Imaging",
                 "Specialized Surgical Suites",
                 "Comfortable In-patient Rooms",
                 "International Clinical Standards",
                 "Expert Multi-Specialty Teams"
               ].map((item) => (
                 <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-semibold text-slate-900">{item}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-slate-900 py-24 sm:py-32">
         <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                <div className="relative p-8 rounded-3xl bg-slate-800 border border-slate-700 shadow-xl overflow-hidden group hover:border-blue-500 transition-colors">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Target className="h-32 w-32 text-blue-400" />
                     </div>
                     <div className="relative space-y-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                            <Target className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Our Mission</h3>
                        <p className="text-lg leading-8 text-slate-300">
                           To provide compassionate, comprehensive, and high-quality healthcare services to our community, while maintaining the highest ethical and professional standards.
                        </p>
                     </div>
                </div>

                <div className="relative p-8 rounded-3xl bg-slate-800 border border-slate-700 shadow-xl overflow-hidden group hover:border-emerald-500 transition-colors">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Eye className="h-32 w-32 text-emerald-400" />
                     </div>
                     <div className="relative space-y-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                            <Eye className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold text-white uppercase tracking-wider">Our Vision</h3>
                        <p className="text-lg leading-8 text-slate-300">
                            To be the leading healthcare provider in the region, recognized for excellence, innovation, and compassion, and to be the hospital of choice for patients and professionals alike.
                        </p>
                     </div>
                </div>
            </div>
         </div>
      </section>

      {/* Stats/Why Choose Us */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-12">
         <div className="mx-auto max-w-2xl lg:text-center mb-16">
            <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest">Why Choose Gargaar?</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Setting the Standard for Care
            </p>
         </div>
         <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
             {[
               { icon: Users, label: "Patients Treated", value: "25k+", color: "bg-blue-50 text-blue-600" },
               { icon: Award, label: "Expert Doctors", value: "50+", color: "bg-emerald-50 text-emerald-600" },
               { icon: Crosshair, label: "Success Rate", value: "99.2%", color: "bg-purple-50 text-purple-600" }
             ].map((stat) => (
                <div key={stat.label} className="text-center p-8 rounded-3xl bg-white shadow-lg border border-slate-100">
                   <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${stat.color} mb-6`}>
                      <stat.icon className="h-8 w-8" />
                   </div>
                   <p className="text-4xl font-extrabold text-slate-900">{stat.value}</p>
                   <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mt-2">{stat.label}</p>
                </div>
             ))}
         </div>
      </section>
    </div>
  );
}
