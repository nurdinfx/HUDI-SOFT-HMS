"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, Clock, User, Phone, Mail, FileText, CheckCircle2, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { getDoctors, Doctor } from "@/services/doctorService";
import { getDepartments } from "@/services/deptService";
import { bookPublicAppointment } from "@/services/appointmentService";
import { cn } from "@/lib/utils";

export default function AppointmentPage() {
  const searchParams = useSearchParams();
  const initialDoctorId = searchParams.get("doctor") || "";

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "male",
    department: "",
    doctorId: initialDoctorId,
    date: "",
    time: "",
    notes: "",
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const patientInfo = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
      };

      const appointmentInfo = {
        doctorId: formData.doctorId,
        date: formData.date,
        time: formData.time,
        notes: formData.notes,
        type: "consultation",
      };

      await bookPublicAppointment(patientInfo, appointmentInfo);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32 lg:px-8 text-center">
        <div className="flex justify-center mb-8">
            <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
            </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Booking Successful!</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Dear <span className="font-bold text-slate-900">{formData.firstName}</span>, your appointment has been scheduled successfully. Our team will contact you shortly on <span className="font-bold text-slate-900">{formData.phone}</span> for confirmation.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <button
            onClick={() => window.location.href = "/"}
            className="rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg hover:bg-blue-500 transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="grid grid-cols-1 gap-x-12 gap-y-16 lg:grid-cols-2">
        {/* Info Column */}
        <div className="lg:pt-12">
            <div className="max-w-xl lg:max-w-lg">
                <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest">Appointment</h2>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                    Schedule Your <span className="text-blue-600">Visit Online</span>
                </p>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                    Gargaar Hospital offers a seamless online booking experience. Fill out the form to request your medical consultation.
                </p>
                
                <div className="mt-12 space-y-8">
                    <div className="flex gap-x-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transform transition-transform hover:scale-[1.02]">
                        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-blue-600 text-white">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Reduced Waiting Time</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500 font-medium">Pre-booking helps us preparation for your visit, significantly reducing your time at the hospital.</p>
                        </div>
                    </div>
                     <div className="flex gap-x-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transform transition-transform hover:scale-[1.02]">
                        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Direct Specialist Access</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500 font-medium">Choose your preferred doctor or department directly during the booking process.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-16 p-8 rounded-3xl bg-blue-50 border border-blue-100 flex flex-col gap-4">
                     <p className="text-blue-900 font-bold flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        Need Emergency Care?
                     </p>
                     <p className="text-blue-700 text-sm font-medium">For life-threatening emergencies, please call our 24/7 hotline immediately instead of booking online.</p>
                     <a href="tel:+25261000000" className="text-xl font-black text-blue-600 mt-2">+252 61 000 000</a>
                </div>
            </div>
        </div>

        {/* Form Column */}
        <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-2xl border border-slate-50 ring-1 ring-slate-900/5">
           {loading ? (
                <div className="flex justify-center items-center h-full min-h-[400px]">
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                </div>
           ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
               {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700 text-sm font-bold">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
               )}

                <div className="space-y-6">
                    <div className="flex items-center gap-4 py-4 border-b border-slate-100">
                         <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                         <h3 className="font-extrabold text-slate-900 uppercase tracking-widest text-sm">Patient Identification</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                            <input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="Juan" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                            <input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="Pérez" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                            <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="+252..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email (Optional)</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="email@example.com" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date of Birth</label>
                            <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold bg-white">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-4">
                   <div className="flex items-center gap-4 py-4 border-b border-slate-100">
                         <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">2</span>
                         <h3 className="font-extrabold text-slate-900 uppercase tracking-widest text-sm">Appointment Details</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Department</label>
                            <select required name="department" value={formData.department} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold bg-white">
                                <option value="">Select a department</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Doctor (Optional)</label>
                            <select name="doctorId" value={formData.doctorId} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold bg-white">
                                <option value="">Any Available Specialist</option>
                                {doctors
                                  .filter(d => !formData.department || d.department === formData.department)
                                  .map(d => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization})</option>)
                                }
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preferred Date</label>
                            <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" min={new Date().toISOString().split('T')[0]} />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preferred Time</label>
                            <input required type="time" name="time" value={formData.time} onChange={handleChange} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                        </div>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes or Reason for Visit</label>
                         <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold resize-none" placeholder="Briefly describe your health concern..."></textarea>
                    </div>
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                            "w-full rounded-full bg-blue-600 px-8 py-5 text-lg font-black text-white shadow-xl transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3",
                            submitting ? "opacity-70 cursor-not-allowed bg-slate-500" : "hover:bg-blue-500 shadow-blue-200"
                        )}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Processing Booking...
                            </>
                        ) : (
                            <>
                                <Calendar className="h-6 w-6" />
                                Confirm Appointment
                                <ChevronRight className="h-5 w-5 ml-auto" />
                            </>
                        )}
                    </button>
                    <p className="mt-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                         Certified Reliable Health Services
                    </p>
                </div>
            </form>
           )}
        </div>
      </div>
    </div>
  );
}
