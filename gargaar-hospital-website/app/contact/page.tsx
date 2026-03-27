import { Mail, Phone, MapPin, Clock, Facebook, Twitter, Instagram, Linkedin, Send, MessageCircle } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex flex-col gap-y-16 py-12">
      {/* Header Section */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600 uppercase tracking-widest">Contact Us</h2>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Get in <span className="text-blue-600">Touch With Us</span>
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Have questions or need assistance? Our team is here to help you with any inquiries regarding our services or your healthcare needs.
          </p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Contact Details */}
          <div className="space-y-8">
               <div className="p-8 rounded-[2rem] bg-blue-600 text-white shadow-xl transform transition-transform hover:-translate-y-1">
                   <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <MessageCircle className="h-6 w-6 text-blue-200" />
                        Direct Contact
                   </h3>
                   <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <Phone className="h-6 w-6 text-blue-200" />
                            </div>
                            <div>
                                <p className="text-sm font-bold opacity-70 uppercase tracking-wider">Phone Number</p>
                                <p className="text-lg font-bold">+252 61 000 000</p>
                            </div>
                        </div>
                         <div className="flex gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <Mail className="h-6 w-6 text-blue-200" />
                            </div>
                            <div>
                                <p className="text-sm font-bold opacity-70 uppercase tracking-wider">Email Address</p>
                                <p className="text-lg font-bold">contact@gargaarhospital.com</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <MapPin className="h-6 w-6 text-blue-200" />
                            </div>
                            <div>
                                <p className="text-sm font-bold opacity-70 uppercase tracking-wider">Location</p>
                                <p className="text-lg font-bold">KM-4 Area, Mogadishu, Somalia</p>
                            </div>
                        </div>
                   </div>
               </div>

                <div className="p-8 rounded-[2rem] bg-white shadow-lg border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-emerald-500" />
                        Working Hours
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm font-medium border-b border-slate-50 pb-2">
                            <span className="text-slate-500">Emergency</span>
                            <span className="text-red-600 font-bold">24 Hours / 7 Days</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium border-b border-slate-50 pb-2">
                            <span className="text-slate-500">Outpatient Dept (OPD)</span>
                            <span className="text-slate-900 font-bold">08:00 - 20:00</span>
                        </div>
                         <div className="flex justify-between items-center text-sm font-medium border-b border-slate-50 pb-2">
                            <span className="text-slate-500">Pharmacy</span>
                            <span className="text-slate-900 font-bold">24 Hours</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-slate-500">Laboratory</span>
                            <span className="text-slate-900 font-bold">24 Hours</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center gap-4">
                     {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                        <a key={i} href="#" className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110 shadow-sm">
                            <Icon className="h-6 w-6" />
                        </a>
                     ))}
                </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-50 ring-1 ring-slate-900/5">
             <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-widest border-b border-slate-50 pb-4">
                Send a <span className="text-blue-600">Message</span>
             </h3>
             <form className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Name</label>
                        <input required className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="Full Name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                        <input required className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" placeholder="+252..." />
                    </div>
                </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                    <select className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold bg-white">
                        <option>General Inquiry</option>
                        <option>Feedback & Suggestions</option>
                        <option>Billing Question</option>
                        <option>Medical Record Request</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Message</label>
                    <textarea required rows={6} className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold resize-none" placeholder="Write your message here..."></textarea>
                </div>
                <div>
                     <button type="submit" className="w-full sm:w-auto rounded-full bg-slate-900 px-12 py-5 text-lg font-black text-white shadow-xl hover:bg-slate-800 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3">
                        <Send className="h-6 w-6" />
                        Send Message
                     </button>
                </div>
             </form>
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 mb-12">
           <div className="relative h-[400px] w-full bg-slate-100 rounded-[3rem] overflow-hidden shadow-inner border-4 border-white ring-1 ring-slate-900/5 group">
                {/* Visual indicator for map */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                    <MapPin className="h-20 w-20 mb-4 group-hover:scale-110 transition-transform text-blue-200" />
                    <p className="font-black text-2xl uppercase tracking-[0.2em] animate-pulse">Hospital Location View</p>
                    <p className="mt-2 font-bold text-slate-400">Gargaar Hospital, KM-4 Area, Mogadishu</p>
                </div>
                {/* Embed actual map if needed later */}
           </div>
      </section>
    </div>
  );
}
