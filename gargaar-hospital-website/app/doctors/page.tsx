"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Filter, Search, User, Award, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { getDoctors, Doctor } from "@/services/doctorService";
import { getDepartments } from "@/services/deptService";
import { cn } from "@/lib/utils";

export default function DoctorsPage() {
  const searchParams = useSearchParams();
  const initialDept = searchParams.get("department") || "";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(initialDept);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      const doctorsData = await getDoctors();
      setDoctors(doctorsData);
      
      const deptsData = await getDepartments();
      setDepartments(deptsData.map(d => d.name));
      
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchesDept = selectedDept === "" || doc.department === selectedDept;
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [doctors, selectedDept, searchQuery]);

  return (
    <div className="flex flex-col gap-y-12 py-12">
      {/* Header Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest text-center">Our Medical Staff</h2>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-center">
            Find an <span className="text-blue-600">Expert Specialist</span>
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600 text-center">
            Our doctors are dedicated to providing the highest quality healthcare with experience and compassion.
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-white rounded-3xl shadow-sm border border-slate-100 ring-1 ring-slate-900/5">
          <div className="relative w-full sm:max-w-md group focus-within:ring-2 focus-within:ring-blue-500 rounded-full transition-shadow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600" />
            <input
              type="text"
              placeholder="Search by name or specialty..."
              className="w-full pl-12 pr-6 py-3 rounded-full border border-slate-200 outline-none  text-slate-900 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
             <button 
                onClick={() => setSelectedDept("")}
                className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all border shrink-0",
                    selectedDept === "" 
                        ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200" 
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                )}
             >
                All Departments
             </button>
             {departments.map((dept) => (
                <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                     className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all border shrink-0 capitalize",
                        selectedDept === dept 
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                    )}
                >
                    {dept}
                </button>
             ))}
          </div>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-12">
        {loading ? (
             <div className="flex justify-center items-center h-64">
                 <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        ) : filteredDoctors.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-center">
                 <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                      <User className="h-10 w-10" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">No doctors found</h3>
                 <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
             </div>
        ) : (
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-12 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {filteredDoctors.map((doc) => (
              <div key={doc.id} className="flex flex-col group relative">
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-slate-100 shadow-lg group-hover:shadow-2xl transition-all">
                   <div className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center text-slate-100 group-hover:scale-110 transition-transform opacity-10">
                        <User className="h-64 w-64" />
                   </div>
                   {doc.avatar && (
                        <Image src={doc.avatar} alt={doc.name} fill className="object-cover transition-transform group-hover:scale-105" />
                   )}
                   <div className="absolute top-4 right-4 animate-bounce">
                        <span className={cn(
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset uppercase shadow-md",
                            doc.status === "available" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-50 text-slate-500 ring-slate-500/20"
                        )}>
                            {doc.status}
                        </span>
                   </div>
                </div>
                <div className="mt-8 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 uppercase ring-1 ring-inset ring-blue-700/10">
                            {doc.department}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold leading-8 tracking-tight text-slate-900">Dr. {doc.name}</h3>
                    <p className="text-base font-bold text-blue-600">{doc.specialization}</p>
                    <p className="mt-4 text-sm leading-6 text-slate-500 mb-6 font-medium capitalize">
                        {doc.qualification || "Experienced clinical specialist"}
                    </p>
                    <div className="flex flex-col gap-2 mb-8">
                         <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                             <Award className="h-4 w-4 text-emerald-500" />
                             <span>{doc.experience || 0} Years Experience</span>
                         </div>
                         <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                             <Clock className="h-4 w-4 text-blue-500" />
                             <span>{doc.availableTimeStart} - {doc.availableTimeEnd}</span>
                         </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-6 border-t border-slate-50">
                    <Link
                        href={`/appointment?doctor=${doc.id}`}
                        className="flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl hover:scale-[1.02] active:scale-95"
                    >
                        <Calendar className="h-4 w-4" />
                        Book Consult
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured/Info Section */}
       <section className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
            <div className="relative isolate overflow-hidden bg-slate-900 px-8 py-16 shadow-2xl rounded-3xl sm:px-16 flex flex-col lg:flex-row items-center justify-between gap-12 group">
                 <div className="max-w-xl text-center lg:text-left">
                     <h2 className="text-3xl font-extrabold tracking-tight text-white mb-6 uppercase tracking-wider">Expertise You Can Trust</h2>
                     <p className="text-lg leading-relaxed text-slate-300">
                        Our recruitment process focuses on internationally qualified doctors with a passion for compassionate patient care and a track record of clinical excellence.
                     </p>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:max-w-md">
                     {[
                        "Board Certified Specialists",
                        "Patient-First Approach",
                        "Multidisciplinary Panels",
                        "Continuous Medical Education"
                     ].map((item) => (
                        <div key={item} className="flex items-center gap-3 bg-slate-800 border border-slate-700 p-4 rounded-2xl transform transition-transform group-hover:scale-105">
                             <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                             <span className="text-sm font-bold text-white uppercase tracking-wide">{item}</span>
                        </div>
                     ))}
                 </div>
            </div>
       </section>
    </div>
  );
}
