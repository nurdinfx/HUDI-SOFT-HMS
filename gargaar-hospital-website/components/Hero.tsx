import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Activity } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <span className="inline-flex items-center space-x-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold leading-6 text-blue-600 ring-1 ring-inset ring-blue-600/10">
               <Activity className="h-4 w-4" />
              <span>Gargaar Hospital - Your Health, Our Priority</span>
            </span>
          </div>
          <h1 className="mt-10 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            World-Class Care <span className="text-blue-600">Right at Your Fingertips</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Dedicated to providing the highest standard of healthcare for you and your family. Experience compassionate care combined with advanced medical technology.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-x-6 gap-y-4">
            <Link
              href="/appointment"
              className="w-full sm:w-auto rounded-full bg-blue-600 px-8 py-4 text-center text-lg font-semibold text-white shadow-lg hover:bg-blue-500 hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Book Appointment
            </Link>
            <Link href="/services" className="text-lg font-semibold leading-6 text-slate-900 flex items-center group transition-colors hover:text-blue-600">
              Explore Our Services <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">24/7 Emergency Care</span>
            </div>
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">Expert Medical Staff</span>
            </div>
             <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">Advanced Diagnostics</span>
            </div>
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">Safe & Modern Facility</span>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="relative -m-2 rounded-2xl bg-slate-900/5 p-2 ring-1 ring-inset ring-slate-900/10 lg:-m-4 lg:rounded-3xl lg:p-4">
               <div className="relative h-[300px] w-full sm:h-[400px] lg:h-[500px] lg:w-[600px] overflow-hidden rounded-xl shadow-2xl border-4 border-white">
                    <Image
                        src="/images/hero.png"
                        alt="Gargaar Hospital Exterior"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white lg:p-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-1 bg-emerald-500" />
                            <div>
                                <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">Trusted By Thousands</p>
                                <p className="text-xl font-bold">Leading Healthcare in the Region</p>
                            </div>
                        </div>
                    </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
