import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Pill } from '../components/Pill';
import { ShowcaseFrame } from '../components/ShowcaseFrame';
import { TokenIcon } from '../components/TokenIcon';
import { riseIn } from '../motion';

// Animated mockup for the premium pricing page's feature showcase (1200x630): the approval history
// telling an exploit story — an approval, the spender getting exploited weeks later, an approved
// transfer draining funds, and the revoke that ends it. Rendered to
// apps/web/public/assets/videos/premium/approved-transfers.mp4; frame 150 doubles as the poster at
// apps/web/public/assets/images/premium/approved-transfers.jpg.

interface HistoryRow {
  eventLabel: string;
  eventClassName: string;
  amount: string;
  amountClassName: string;
  date: string;
  appearsAt: number;
}

// Event pill colors follow the real StatusLabel dark-mode variants (success/info/danger). The
// spender is fictional so the exploit story doesn't implicate a real protocol.
const SPENDER_NAME = 'OmniSwap Router';

const HISTORY_ROWS: HistoryRow[] = [
  {
    eventLabel: 'Approved',
    eventClassName: 'bg-green-900/40 text-green-400',
    amount: 'Unlimited',
    amountClassName: 'text-zinc-200',
    date: '12 Jun 2026',
    appearsAt: 12,
  },
  {
    eventLabel: 'Approved Transfer',
    eventClassName: 'bg-blue-900/40 text-blue-400',
    amount: '-25,000 USDC',
    amountClassName: 'text-red-400',
    date: '7 Aug 2026',
    appearsAt: 60,
  },
  {
    eventLabel: 'Revoked',
    eventClassName: 'bg-red-900/40 text-red-400',
    amount: '-',
    amountClassName: 'text-zinc-500',
    date: '7 Aug 2026',
    appearsAt: 100,
  },
];

export const ApprovedTransfersShowcase = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <ShowcaseFrame title="Approval History">
      <div className="divide-y divide-zinc-800">
        {HISTORY_ROWS.map((row) => (
          <div
            key={row.eventLabel}
            className="flex items-center gap-4 px-10 py-5"
            style={riseIn(frame, fps, row.appearsAt)}
          >
            <TokenIcon symbol="USDC" size={36} />
            <span className="text-2xl font-medium text-zinc-100">USDC</span>
            <Pill className={`w-48 py-1.5 text-lg font-medium ${row.eventClassName}`}>{row.eventLabel}</Pill>
            <span className="text-xl text-zinc-400">{SPENDER_NAME}</span>
            <div className="ml-auto flex flex-col items-end gap-0.5">
              <span className={`text-xl font-medium tabular-nums ${row.amountClassName}`}>{row.amount}</span>
              <span className="text-base text-zinc-500">{row.date}</span>
            </div>
          </div>
        ))}
      </div>
    </ShowcaseFrame>
  );
};
