import { useState } from 'react';
import { Armchair, Bed, Lock, Check, AlertCircle } from 'lucide-react';

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
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading live cabin seat availability...</p>
      </div>
    );
  }

  if (!seatLayout || !seatLayout.seats || seatLayout.seats.length === 0) {
    return (
      <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="text-xs font-medium text-slate-600">No seat layout configured for this vehicle.</p>
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
    <div className="space-y-4">
      {/* Deck Selector (if multi-deck) */}
      {deckCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: deckCount }, (_, i) => i + 1).map((deck) => (
            <button
              key={deck}
              type="button"
              onClick={() => setSelectedDeck(deck)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDeck === deck
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {deck === 1 ? 'Lower Deck' : 'Upper Deck'}
            </button>
          ))}
        </div>
      )}

      {/* Seat Map Cabin Frame */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 max-w-md mx-auto">
        {/* Cabin Front / Driver Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Front of Bus
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>
            <span className="text-[11px]">Driver Cabin</span>
          </div>
        </div>

        {/* Seats Grid */}
        <div className="space-y-2.5">
          {rowNumbers.map((rowNum) => {
            const seatsInRow = filteredSeats.filter((s) => s.row === rowNum);
            if (seatsInRow.length === 0) return null;

            return (
              <div key={rowNum} className="flex items-center justify-between gap-3">
                {/* Left Side Seats */}
                <div className="flex items-center gap-2">
                  {colNumbers
                    .filter((c) => c <= aisleIndex)
                    .map((colNum) => {
                      const seat = seatsInRow.find((s) => s.col === colNum);
                      return renderSeatItem(seat, selectedSeats, onSeatToggle, maxSelectable);
                    })}
                </div>

                {/* Aisle */}
                <div className="w-6 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-slate-300 select-none">
                    {rowNum}
                  </span>
                </div>

                {/* Right Side Seats */}
                <div className="flex items-center gap-2">
                  {colNumbers
                    .filter((c) => c > aisleIndex)
                    .map((colNum) => {
                      const seat = seatsInRow.find((s) => s.col === colNum);
                      return renderSeatItem(seat, selectedSeats, onSeatToggle, maxSelectable);
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-600 shadow-2xs" />
          <span className="text-slate-600 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
            <Check className="w-3 h-3" />
          </div>
          <span className="text-emerald-700 font-bold">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400">
            <Lock className="w-2.5 h-2.5" />
          </div>
          <span className="text-slate-400 font-medium">Booked / Held</span>
        </div>
      </div>
    </div>
  );
}

function renderSeatItem(seat, selectedSeats, onSeatToggle, maxSelectable) {
  if (!seat) {
    return <div key={Math.random()} className="w-9 h-9" />;
  }

  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = seat.isAvailable;
  const isSleeper = seat.seatType === 'sleeper';

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
      title={`Seat ${seat.seatNumber} (${seat.seatType}) - ₹${seat.fare || 0}${
        !isAvailable ? ' - Occupied/Held' : ''
      }`}
      className={`group relative flex flex-col items-center justify-center rounded-lg transition-all select-none ${
        isSleeper ? 'w-10 h-14' : 'w-9 h-10'
      } ${
        !isAvailable
          ? 'bg-slate-200/90 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
          : isSelected
          ? 'bg-emerald-600 text-white border-2 border-emerald-700 shadow-sm transform scale-105'
          : 'bg-white text-slate-700 border border-slate-300 hover:border-amber-500 hover:shadow-xs active:scale-95'
      }`}
    >
      {/* Icon */}
      {isSleeper ? (
        <Bed className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
      ) : (
        <Armchair className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
      )}

      {/* Seat Number */}
      <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
        {seat.seatNumber}
      </span>

      {/* Lock for occupied */}
      {!isAvailable && (
        <div className="absolute inset-0 bg-slate-900/10 rounded-lg flex items-center justify-center">
          <Lock className="w-3 h-3 text-slate-500" />
        </div>
      )}
    </button>
  );
}

