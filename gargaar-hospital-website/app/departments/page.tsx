"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Users, Activity, Heart, Shield, Microscope } from "lucide-react";
import { getDepartments } from "@/services/deptService";

const departmentIcons: Record<string, any> = {
  "General Medicine": Activity,
  "Pediatrics": Users,
  "Cardiology": Heart,
  "Surgery": Microscope,
  "Urgencies": Shield,
  "Laboratory": Microscope,
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDepts() {
      const data = await getDepartments();
      setDepartments(data);
      setLoading(false);
    }
    fetchDepts();
  }, []);

  return (
    <div className="flex flex-col gap-y-16 py-12">
      {/* Header Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest">Departments</h2>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Specialized <span className="text-blue-600">Hospital Departments</span>
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
             Our clinical departments are led by some of the most qualified medical experts in the region.
          </p>
        </div>
      </section>

      {/* Departments Grid */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-12">
        {loading ? (
             <div className="flex justify-center items-center h-64">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        ) : (
             <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
             {departments.map((dept) => {
               const Icon = departmentIcons[dept.name] || Activity;
               return (
                 <div key={dept.name} className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-900/5 hover:shadow-2xl transition-all group">
                   <div className="relative h-48 w-full overflow-hidden bg-blue-50">
                        <div className="absolute inset-0 flex items-center justify-center text-blue-100 group-hover:scale-110 transition-transform">
                             <Icon className="h-32 w-32" />
                        </div>
                   </div>
                   <div className="flex flex-1 flex-col p-8">
                      <div className="flex items-center justify-between mb-4">
                           <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Icon className="h-6 w-6" />
                           </div>
                           <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                              {dept.doctorCount} Doctors
                           </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-4">{dept.name}</h3>
                      <p className="text-sm leading-6 text-slate-600 mb-8 font-medium">
                         {dept.description}
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-50">
                           <Link href={`/doctors?department=${dept.name}`} className="text-sm font-bold text-blue-600 hover:text-blue-500 flex items-center gap-2 group/link">
                              Find a Specialist <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                           </Link>
                      </div>
                   </div>
                 </div>
               );
             })}
           </div>
        )}
      </section>

       {/* FAQ/Department Info Section */}
       <section className="bg-slate-50 py-24 sm:py-32">
         <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
                 <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Departmental Excellence</h2>
                 <p className="mt-6 text-lg leading-8 text-slate-600">
                    Our departments work together in a synchronized manner to provide you with the most efficient care possible.
                 </p>
            </div>
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 italic space-y-4">
                    <p className="font-bold text-slate-900 text-xl tracking-wide">"Inter-disciplinary Consultation"</p>
                    <p className="text-slate-600 leading-relaxed font-medium capitalize">
                        We pride ourselves on our ability to conduct rapid inter-departmental consultations, ensuring that complex medical cases are reviewed by all necessary specialists.
                    </p>
                 </div>
                 <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 italic space-y-4">
                    <p className="font-bold text-slate-900 text-xl tracking-wide">"Modern Medical Training"</p>
                    <p className="text-slate-600 leading-relaxed font-medium capitalize">
                         Each department at Gargaar Hospital is committed to continuous learning and the implementation of the latest evidence-based clinical practices.
                    </p>
                 </div>
            </div>
         </div>
       </section>
    </div>
  );
}
