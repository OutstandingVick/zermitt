type ArtProps = { className?: string };

export function MoneyCurrent({ className = "" }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 620 180" fill="none" aria-hidden="true">
      <path d="M8 130c72-96 120 58 194-16S322 26 394 96s132 14 218-62" stroke="currentColor" strokeWidth="2" strokeDasharray="8 10" />
      <path d="m594 22 20 10-14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="202" cy="113" r="7" fill="currentColor" />
      <circle cx="395" cy="96" r="7" fill="currentColor" />
    </svg>
  );
}

export function HeartPhone({ className = "" }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none" role="img" aria-label="A phone showing a heart message">
      <rect x="42" y="18" width="96" height="144" rx="24" fill="#EEF2EA" stroke="#0E1A16" strokeWidth="4" />
      <path d="M63 65h55a12 12 0 0 1 12 12v30a12 12 0 0 1-12 12H91l-18 15v-15H63a12 12 0 0 1-12-12V77a12 12 0 0 1 12-12Z" fill="#D8CCFF" stroke="#0E1A16" strokeWidth="4" strokeLinejoin="round" />
      <path d="M90 104S70 92 70 81c0-12 15-14 20-4 5-10 20-8 20 4 0 11-20 23-20 23Z" fill="#FF6A55" />
      <path d="M77 36h26" stroke="#0E1A16" strokeWidth="4" strokeLinecap="round" />
      <circle cx="90" cy="144" r="5" fill="#0FB59E" />
    </svg>
  );
}

export function ReceiptSmile({ className = "" }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none" role="img" aria-label="A receipt with a smiling verification mark">
      <path d="M40 18h100v144l-12-9-12 9-13-9-13 9-13-9-13 9-12-9-12 9V18Z" fill="#D6F3EE" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M61 51h58M61 69h38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="90" cy="111" r="27" fill="#0FB59E" />
      <path d="m76 110 9 9 20-21" stroke="#0E1A16" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M78 130c8 5 17 5 25 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function DollarPlane({ className = "" }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 220 160" fill="none" role="img" aria-label="A small plane carrying dollars home">
      <path d="M20 113c46-2 77-14 104-38" stroke="#0FB59E" strokeWidth="3" strokeDasharray="7 8" strokeLinecap="round" />
      <path d="m107 80 82-51-32 71-24-17-26-3Z" fill="#FFB43C" stroke="#0E1A16" strokeWidth="4" strokeLinejoin="round" />
      <path d="m133 83 56-54-32 71" stroke="#0E1A16" strokeWidth="4" strokeLinejoin="round" />
      <rect x="35" y="89" width="61" height="42" rx="10" fill="#D8CCFF" stroke="#0E1A16" strokeWidth="4" transform="rotate(-7 35 89)" />
      <text x="56" y="118" fill="#0E1A16" fontFamily="monospace" fontSize="25" fontWeight="700">$</text>
    </svg>
  );
}
