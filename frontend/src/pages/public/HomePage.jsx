import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  Users,
  Bus,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Ticket,
  Clock,
  RotateCcw,
  Percent,
  Star,
  Award,
  BadgeCheck,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';

export default function HomePage() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [allStops, setAllStops] = useState([]);

  // Fetch stops list once for autocomplete
  useEffect(() => {
    let isMounted = true;
    api.get('/stops?limit=100')
      .then((res) => {
        if (isMounted && res.data?.stops) {
          setAllStops(res.data.stops);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSwapStops = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const setDateOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setTravelDate(d.toISOString().split('T')[0]);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin.trim()) params.append('origin', origin.trim());
    if (destination.trim()) params.append('destination', destination.trim());
    if (travelDate) params.append('date', travelDate);
    navigate(`/search?${params.toString()}`);
  };

  const popularRoutes = [
    {
      from: 'Delhi',
      to: 'Chandigarh',
      distance: '250 km',
      duration: '4h 30m',
      startingFare: '₹450',
      busTypes: 'AC Sleeper, Volvo 2+2',
      operatorCount: '12+ Operators Daily'
    },
    {
      from: 'Chandigarh',
      to: 'Amritsar',
      distance: '230 km',
      duration: '4h 15m',
      startingFare: '₹380',
      busTypes: 'Bharat Benz AC Seater',
      operatorCount: '8+ Operators Daily'
    },
    {
      from: 'Ludhiana',
      to: 'Delhi',
      distance: '310 km',
      duration: '5h 45m',
      startingFare: '₹550',
      busTypes: 'Multi-Axle Sleeper',
      operatorCount: '15+ Operators Daily'
    },
    {
      from: 'Delhi',
      to: 'Jaipur',
      distance: '280 km',
      duration: '5h 30m',
      startingFare: '₹490',
      busTypes: 'Electric AC Express',
      operatorCount: '20+ Operators Daily'
    },
    {
      from: 'Bengaluru',
      to: 'Chennai',
      distance: '340 km',
      duration: '6h 00m',
      startingFare: '₹650',
      busTypes: 'Volvo Multi-Axle',
      operatorCount: '25+ Operators Daily'
    },
    {
      from: 'Mumbai',
      to: 'Pune',
      distance: '150 km',
      duration: '3h 15m',
      startingFare: '₹320',
      busTypes: 'Scania AC Seater',
      operatorCount: '30+ Operators Daily'
    }
  ];

  const popularDestinations = [
    {
      name: 'Delhi',
      tagline: 'Capital Heritage & Corridors',
      image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80',
      routes: '150+ Daily Trips'
    },
    {
      name: 'Chandigarh',
      tagline: 'The City Beautiful',
      image: 'https://images.unsplash.com/photo-1622306757640-c11dcfe70826?auto=format&fit=crop&w=600&q=80',
      routes: '90+ Daily Trips'
    },
    {
      name: 'Jaipur',
      tagline: 'The Royal Pink City',
      image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80',
      routes: '120+ Daily Trips'
    },
    {
      name: 'Amritsar',
      tagline: 'Spiritual Golden Temple',
      image: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&w=600&q=80',
      routes: '60+ Daily Trips'
    }
  ];

  const offers = [
    {
      code: 'BUSGO100',
      discount: 'Flat ₹100 Off',
      subtitle: 'On your first intercity bus booking',
      validity: 'Valid on all routes',
      badge: 'FIRST RIDE'
    },
    {
      code: 'FESTIVE50',
      discount: 'Save 15% Up to ₹150',
      subtitle: 'Valid on AC Sleeper and Volvo coaches',
      validity: 'Use code at checkout',
      badge: 'FESTIVAL SPECIAL'
    },
    {
      code: 'CORRIDOR20',
      discount: 'Zero Convenience Fee',
      subtitle: 'On Delhi-Chandigarh & Delhi-Jaipur corridors',
      validity: 'Instant discount applied',
      badge: 'CORRIDOR SAVER'
    }
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative bg-[#171C2B] text-white pt-10 sm:pt-14 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[#232A3E] overflow-hidden">
        {/* Subtle geometric travel grid accent */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#D92D3A_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative max-w-7xl mx-auto">
          {/* Main Headline & Value Statement */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D92D3A]/15 text-[#D92D3A] border border-[#D92D3A]/30 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#D92D3A]" />
              <span>India&apos;s Smartest Bus Reservation Platform</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3.5 leading-tight">
              Your Journey <span className="text-[#D92D3A]">Starts Here.</span>
            </h1>
            <p className="text-sm sm:text-base text-[#98A2B3] leading-relaxed max-w-2xl mx-auto">
              Book verified AC Sleepers, Volvo, and Intercity express buses with live seat layouts, segment-based seat allocation, and instant confirmation.
            </p>
          </div>

          {/* Centralized Bus Search Panel */}
          <div className="max-w-5xl mx-auto bg-white text-[#202633] rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 sm:p-6 lg:p-7 border border-[#E4E7EC]">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* 1. Origin Stop / City */}
                <div className="md:col-span-4 relative">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5">
                    From (Boarding City / Stop)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#D92D3A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      list="home-stop-suggestions"
                      placeholder="e.g., Delhi ISBT, Bengaluru"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#D0D5DD] text-sm font-semibold text-[#202633] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] bg-[#F8F9FA]/50"
                      required
                    />
                  </div>
                </div>

                {/* Swap Button */}
                <div className="hidden md:flex md:col-span-1 items-center justify-center pt-5">
                  <button
                    type="button"
                    onClick={handleSwapStops}
                    title="Swap locations"
                    className="w-10 h-10 rounded-full border border-[#D0D5DD] bg-white text-[#475467] hover:text-[#D92D3A] hover:border-[#D92D3A] hover:bg-[#FFF1F2] flex items-center justify-center transition-all shadow-xs cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Destination Stop / City */}
                <div className="md:col-span-4 relative">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5">
                    To (Dropping City / Stop)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#16865C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      list="home-stop-suggestions"
                      placeholder="e.g., Chandigarh, Jaipur"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#D0D5DD] text-sm font-semibold text-[#202633] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] bg-[#F8F9FA]/50"
                      required
                    />
                  </div>
                </div>

                {/* 3. Journey Date */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5">
                    Journey Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={travelDate}
                      onChange={(e) => setTravelDate(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#D0D5DD] text-sm font-semibold text-[#202633] focus:outline-none focus:ring-2 focus:ring-[#D92D3A]/20 focus:border-[#D92D3A] bg-[#F8F9FA]/50 cursor-pointer"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Row: Quick Presets + Search CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#F2F4F7]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#667085]">
                  <span className="text-[11px] uppercase tracking-wider text-[#98A2B3] font-bold">Quick Dates:</span>
                  <button
                    type="button"
                    onClick={() => setDateOffset(0)}
                    className="px-2.5 py-1 rounded-md bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#344054] transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateOffset(1)}
                    className="px-2.5 py-1 rounded-md bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#344054] transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateOffset(2)}
                    className="px-2.5 py-1 rounded-md bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#344054] transition-colors"
                  >
                    Day After
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto px-8 py-3 text-sm font-bold tracking-wide shadow-md"
                  icon={Search}
                >
                  SEARCH BUSES
                </Button>
              </div>
            </form>
          </div>

          {/* Datalist for active stop suggestions */}
          <datalist id="home-stop-suggestions">
            {allStops.map((s) => (
              <option key={s._id} value={s.city ? `${s.city} - ${s.stopName}` : s.stopName} />
            ))}
          </datalist>

          {/* Value Badges Banner */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-center text-xs">
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <BadgeCheck className="w-4 h-4 text-[#D92D3A]" />
              <span>100% Verified Operators</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Live Segment Holds</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Instant Refund Rules</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Simulated Payment Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* Special Offers Section */}
      <section id="offers-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D92D3A]">
              Exclusive Savings
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#202633] tracking-tight">
              Trending Bus Booking Offers
            </h2>
          </div>
          <Link
            to="/search"
            className="text-xs font-bold text-[#D92D3A] hover:text-[#B91C2C] flex items-center gap-1"
          >
            <span>View All Trips</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {offers.map((offer, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#E4E7EC] p-5 shadow-[0_1px_3px_0_rgba(16,24,40,0.05)] hover:border-[#FDA29B] transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF1F2] text-[#D92D3A] border border-[#FECDD3]">
                  {offer.badge}
                </span>
                <h3 className="text-base font-extrabold text-[#202633] tracking-tight">
                  {offer.discount}
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed">
                  {offer.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F2F4F7] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#98A2B3] uppercase block font-semibold">Promo Code</span>
                  <span className="text-xs font-mono font-bold text-[#202633]">{offer.code}</span>
                </div>
                <Link
                  to={`/search?code=${offer.code}`}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#F8F9FA] hover:bg-[#FFF1F2] text-[#D92D3A] transition-colors"
                >
                  Book With Offer
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Bus Corridors */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D92D3A]">
            Top Intercity Routes
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#202633] tracking-tight">
            Popular Travel Corridors
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Real schedule availability across India&apos;s most frequented transport links.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularRoutes.map((route, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#E4E7EC] p-5 hover:border-[#D92D3A]/40 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-extrabold text-sm sm:text-base text-[#202633] group-hover:text-[#D92D3A] transition-colors">
                    {route.from} <span className="text-[#98A2B3]">→</span> {route.to}
                  </div>
                  <span className="text-xs font-bold text-[#16865C] bg-[#ECFDF3] px-2 py-0.5 rounded-md border border-[#ABEFC6]">
                    from {route.startingFare}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#667085] mt-1">
                  <span>{route.distance}</span>
                  <span>•</span>
                  <span>{route.duration}</span>
                  <span>•</span>
                  <span className="text-slate-500 font-medium">{route.busTypes}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F2F4F7] flex items-center justify-between">
                <span className="text-[11px] text-[#98A2B3] font-medium">{route.operatorCount}</span>
                <Link
                  to={`/search?origin=${route.from}&destination=${route.to}&date=${travelDate}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#D92D3A] group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Book Seats</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works: 5-Step Commercial Timeline */}
      <section className="bg-white border-y border-[#E4E7EC] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D92D3A]">
              Simple &amp; Reliable
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#202633] tracking-tight mt-1">
              How Booking Works on BusGo
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              From search to verified digital boarding pass in 5 seamless steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF1F2] text-[#D92D3A] border border-[#FECDD3] flex items-center justify-center font-black mx-auto text-base">
                1
              </div>
              <h4 className="text-sm font-bold text-[#202633]">Search Route</h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Enter your origin, destination, and journey date to inspect live trips.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF1F2] text-[#D92D3A] border border-[#FECDD3] flex items-center justify-center font-black mx-auto text-base">
                2
              </div>
              <h4 className="text-sm font-bold text-[#202633]">Select Seat</h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Pick your preferred sleeper or seater seats with live interactive seat maps.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF1F2] text-[#D92D3A] border border-[#FECDD3] flex items-center justify-center font-black mx-auto text-base">
                3
              </div>
              <h4 className="text-sm font-bold text-[#202633]">Passenger Info</h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Provide traveler details with a 10-minute temporary seat hold guarantee.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF1F2] text-[#D92D3A] border border-[#FECDD3] flex items-center justify-center font-black mx-auto text-base">
                4
              </div>
              <h4 className="text-sm font-bold text-[#202633]">Simulate Payment</h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Execute payment simulation backed by atomic idempotency keys.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ECFDF3] text-[#16865C] border border-[#ABEFC6] flex items-center justify-center font-black mx-auto text-base">
                5
              </div>
              <h4 className="text-sm font-bold text-[#202633]">Get E-Ticket</h4>
              <p className="text-xs text-[#667085] leading-relaxed">
                Receive instant confirmed PNR and official printable boarding ticket.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose BusGo? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D92D3A]">
            Platform Advantage
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#202633] tracking-tight mt-1">
            Why Millions Trust BusGo
          </h2>
          <p className="text-xs text-[#667085] mt-1">
            Engineered for high concurrency, transparent seat allocation, and zero booking friction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#D92D3A] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202633]">Segment-Based Seat Reuse</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Our advanced routing architecture enables passengers traveling non-overlapping segments to reuse the same seat without conflicts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#D92D3A] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202633]">10-Minute Atomic Hold</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              When you pick a seat, it is held exclusively for you during checkout. No sudden seat snatches or booking collision surprises.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#D92D3A] flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202633]">Transparent Cancellation</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Clear tiered cancellation policies based on departure window. Calculate your exact refund before confirming cancellation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#D92D3A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202633]">Simulated Payment Engine</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Idempotent payment transactions with simulated success and failure paths. Zero real card exposure while replicating commercial payment gateways.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#D92D3A] flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202633]">Instant Digital Boarding Pass</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              View, print, or download your verified e-ticket with PNR number, QR mockup, and passenger manifest identification.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E7EC] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#D92D3A] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202633]">Governed Fleet Operators</h3>
            <p className="text-xs text-[#667085] leading-relaxed">
              Every transport operator is audited and approved by BusGo administration before scheduling routes and accepting passengers.
            </p>
          </div>
        </div>
      </section>

      {/* Top Destinations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D92D3A]">
            Destinations in Focus
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#202633] tracking-tight">
            Popular Travel Cities
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {popularDestinations.map((dest, idx) => (
            <Link
              key={idx}
              to={`/search?destination=${dest.name}`}
              className="group relative rounded-2xl overflow-hidden border border-[#E4E7EC] shadow-xs aspect-4/3 flex flex-col justify-end p-5 text-white"
            >
              <img
                src={dest.image}
                alt={dest.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#171C2B] via-[#171C2B]/50 to-transparent"></div>

              <div className="relative z-10 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                  {dest.routes}
                </span>
                <h3 className="text-lg font-black tracking-tight text-white">{dest.name}</h3>
                <p className="text-xs text-slate-300">{dest.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
