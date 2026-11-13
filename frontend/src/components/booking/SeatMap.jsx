import { useState } from 'react';
import { Armchair, Bed, Lock, Check, AlertCircle, Compass } from 'lucide-react';

export default function SeatMap({
  seatLayout,
  selectedSeats = [],
  onSeatToggle,
  maxSelectable = 6,
  segmentFare = 0,
  loading = false
}) {
  const [selectedDeck, setSelectedDeck] = useState(1);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Loading live cabin seat layout & availability...</p>
      </div>
    );
  }

  if (!seatLayout || !seatLayout.seats || seatLayout.seats.length === 0) {
    return (
      <div className="py-10 text-center bg-white rounded-xl border border-dashed border-slate-300">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">No seat layout configured for this bus.</p>
        <p className="text-xs text-slate-500 mt-1">Please select another bus service.</p>
      </div>
    );
  }

  const { rows = 10, columns = 4, deckCount = 1, seats = [] } = seatLayout;
  const filteredSeats = seats.filter((s) => (s.deck || 1) === selectedDeck);

  // Group seats by row
  const rowNumbers = Array.from({ length: rows }, (_, i) => i + 1);
  const colNumbers = Array.from({ length: columns }, (_, i) => i + 1);

  // Split columns for aisle (e.g. for 4 cols: left=[1,2], right=[3,4]; for 3 cols: left=[1,2], right=[3])
  const aisleIndex = Math.ceil(columns / 2);

  return (
    <div className="space-y-5">
      {/* Deck Selector (if multi-deck) */}
      {deckCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: deckCount }, (_, i) => i + 1).map((deck) => (
            <button
              key={deck}
              type="button"
              onClick={() => setSelectedDeck(deck)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                selectedDeck === deck
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {deck === 1 ? 'Lower Deck' : 'Upper Deck'}
            </button>
          ))}
        </div>
      )}

      {/* Bus Chassis Shell Container */}
      <div className="max-w-md mx-auto bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm relative overflow-hidden">
        {/* Subtle Bus Windshield Arc at Top */}
        <div className="w-24 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 opacity-70" />

        {/* Cabin Front & Steering Wheel Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Front Cabin
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <span className="text-[11px] font-bold text-slate-500">Driver</span>
            {/* Steering Wheel Graphic */}
            <div className="w-7 h-7 rounded-full border-2 border-slate-400 flex items-center justify-center relative bg-slate-50">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <div className="absolute top-1 bottom-1 w-0.5 bg-slate-400" />
              <div className="absolute left-1 right-1 h-0.5 bg-slate-400" />
            </div>
          </div>
        </div>

        {/* Seats Grid */}
        <div className="space-y-3">
          {rowNumbers.map((rowNum) => {
            const seatsInRow = filteredSeats.filter((s) => s.row === rowNum);
            if (seatsInRow.length === 0) return null;

            return (
              <div key={rowNum} className="flex items-center justify-between gap-3">
                {/* Left Window / Aisle Seats */}
                <div className="flex items-center gap-2">
                  {colNumbers
                    .filter((c) => c <= aisleIndex)
                    .map((colNum) => {
                      const seat = seatsInRow.find((s) => s.col === colNum);
                      return renderSeatItem(seat, selectedSeats, onSeatToggle, maxSelectable, segmentFare);
                    })}
                </div>

                {/* Center Aisle Indicator */}
                <div className="w-8 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-slate-300 select-none">
                    R{rowNum}
                  </span>
                </div>

                {/* Right Aisle / Window Seats */}
                <div className="flex items-center gap-2">
                  {colNumbers
                    .filter((c) => c > aisleIndex)
                    .map((colNum) => {
                      const seat = seatsInRow.find((s) => s.col === colNum);
                      return renderSeatItem(seat, selectedSeats, onSeatToggle, maxSelectable, segmentFare);
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rear of Bus Indicator */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Rear of Bus
          </span>
        </div>
      </div>

      {/* Seat Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 max-w-md mx-auto flex flex-wrap items-center justify-center gap-5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-white border-2 border-slate-300 shadow-2xs" />
          <span className="text-slate-600 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-primary text-white flex items-center justify-center shadow-2xs">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span className="text-primary font-bold">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-slate-200 border border-slate-300 flex items-center justify-center">
            <Lock className="w-2.5 h-2.5 text-slate-400" />
          </div>
          <span className="text-slate-400 font-medium">Booked / Held</span>
        </div>
      </div>
    </div>
  );
}

function renderSeatItem(seat, selectedSeats, onSeatToggle, maxSelectable, segmentFare) {
  if (!seat) {
    return <div key={`empty-${Math.random()}`} className="w-10 h-10" />;
  }

  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = seat.isAvailable;
  const isSleeper = seat.seatType === 'sleeper';
  const effectiveFare = seat.fare || segmentFare;

  const handleClick = () => {
    if (!isAvailable) return;
    if (!isSelected && selectedSeats.length >= maxSelectable) {
      alert(`You can select a maximum of ${maxSelectable} seats per booking.`);
      return;
    }
    onSeatToggle(seat.seatNumber);
  };

  return (
    <button
      key={seat.seatNumber}
      type="button"
      onClick={handleClick}
      disabled={!isAvailable}
      title={`Seat ${seat.seatNumber} (${seat.seatType || 'seater'}) - ₹${effectiveFare}${
        !isAvailable ? ' - Occupied/Held' : ' - Click to select'
      }`}
      className={`group relative flex flex-col items-center justify-center rounded-xl transition-all select-none ${
        isSleeper ? 'w-11 h-16' : 'w-10 h-11'
      } ${
        !isAvailable
          ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
          : isSelected
          ? 'bg-primary text-white border-2 border-primary-hover shadow-md scale-105'
          : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-primary hover:shadow-xs active:scale-95'
      }`}
    >
      {/* Icon */}
      {isSleeper ? (
        <Bed className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : isAvailable ? 'text-slate-600' : 'text-slate-300'}`} />
      ) : (
        <Armchair className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : isAvailable ? 'text-slate-600' : 'text-slate-300'}`} />
      )}

      {/* Seat Number */}
      <span className={`text-[10px] font-black mt-0.5 tracking-tight ${isSelected ? 'text-white' : isAvailable ? 'text-slate-800' : 'text-slate-400'}`}>
        {seat.seatNumber}
      </span>

      {/* Subtle Lock overlay if occupied */}
      {!isAvailable && (
        <div className="absolute inset-0 bg-slate-200/40 rounded-xl flex items-center justify-center pointer-events-none">
          <Lock className="w-3 h-3 text-slate-400" />
        </div>
      )}
    </button>
  );
}
