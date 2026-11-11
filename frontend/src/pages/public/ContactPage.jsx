import { Mail, Phone, MapPin, Send } from 'lucide-react';
import Card from '../../components/ui/Card';
import InputField from '../../components/forms/InputField';
import Button from '../../components/ui/Button';

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Contact BusGo Support
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Need assistance with ticket bookings, operator onboarding, or API integration? Reach out to our 24/7 transport support desk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Email Inquiries</span>
              <span className="text-sm font-bold text-slate-800">support@busgo.com</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Toll-Free Helpline</span>
              <span className="text-sm font-bold text-slate-800">1800-BUS-GO-2026</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">Headquarters</span>
              <span className="text-xs font-bold text-slate-800">Transport Tower, Cyber City, New Delhi</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card title="Send a Message" subtitle="We typically respond within 15 minutes">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Your Name" placeholder="Rajesh Kumar" required />
                <InputField label="Email Address" type="email" placeholder="rajesh@example.com" required />
              </div>
              <InputField label="Subject / PNR No." placeholder="Query regarding booking or operator verification" />
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Message
                </label>
                <textarea
                  rows="4"
                  placeholder="How can our operations team assist you?"
                  className="block w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                ></textarea>
              </div>
              <Button variant="primary" size="md" icon={Send}>
                Send Inquiries
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

