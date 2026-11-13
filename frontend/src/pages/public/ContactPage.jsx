import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import InputField from '../../components/forms/InputField';
import Button from '../../components/ui/Button';

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#D92D3A]">
          24x7 Support Desk
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-[#202633] tracking-tight">
          We&apos;re Here to Help Your Journey
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          Assistance with live bookings, PNR inquiries, cancellations, refunds, or operator fleet onboarding.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-5 flex items-center gap-3.5 shadow-xs">
            <div className="p-3 rounded-xl bg-[#FFF1F2] text-[#D92D3A] shrink-0 border border-[#FECDD3]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#667085] font-bold uppercase tracking-wider block">Customer Support</span>
              <span className="text-sm font-bold text-[#202633]">support@busgo.com</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-5 flex items-center gap-3.5 shadow-xs">
            <div className="p-3 rounded-xl bg-[#ECFDF3] text-[#16865C] shrink-0 border border-[#ABEFC6]">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#667085] font-bold uppercase tracking-wider block">Toll-Free Helpline</span>
              <span className="text-sm font-bold text-[#202633]">1800-BUS-GO-2026</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-5 flex items-center gap-3.5 shadow-xs">
            <div className="p-3 rounded-xl bg-[#F0F2F5] text-[#171C2B] shrink-0 border border-[#D0D5DD]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#667085] font-bold uppercase tracking-wider block">Central Dispatch Office</span>
              <span className="text-xs font-bold text-[#202633] block">Transport Hub, Connaught Place, New Delhi</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-xs text-[#D92D3A] space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Live Bus Tracking Guarantee
            </span>
            <p className="text-[#667085] text-[11px]">
              If you hold an active booking with a confirmed PNR, operator phone contact is available on your e-ticket.
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <Card title="Send an Inquiry" subtitle="Our travel support desk will reply within 15 minutes">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Full Name" placeholder="e.g. Ramesh Chandra" required />
                <InputField label="Email Address" type="email" placeholder="ramesh@example.com" required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Mobile Phone" placeholder="9876543210" />
                <InputField label="PNR Number (If applicable)" placeholder="e.g. BG9AB735B9" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-1.5">
                  How can we help?
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your inquiry, rescheduling question, or operator partnership proposal..."
                  className="w-full rounded-xl border border-[#D0D5DD] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A]"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" size="md" icon={Send} type="submit">
                  Submit Support Ticket
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
