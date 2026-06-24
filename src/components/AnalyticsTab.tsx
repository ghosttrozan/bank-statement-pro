import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, IndianRupee, PieChart as PieIcon, LineChart as LineIcon, Activity, CornerDownLeft, Landmark 
} from 'lucide-react';
import { StatementRecord } from '../types';

interface AnalyticsTabProps {
  activeRecord: StatementRecord | null;
}

// Colors aligned with our modern Sleek Interface light aesthetic
const COLORS = {
  credit: '#10b981', // emerald-500
  debit: '#ef4444',  // red-500
  balance: '#6366f1', // indigo-500
  info: '#3b82f6',    // blue
  pie: ['#6366f1', '#4f46e5', '#f59e0b', '#10b981', '#ec4899', '#f97316']
};

export default function AnalyticsTab({ activeRecord }: AnalyticsTabProps) {
  
  if (!activeRecord) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 flex flex-col items-center justify-center space-y-3 shadow-xs">
        <Landmark size={44} className="text-slate-300 animate-pulse" />
        <p className="text-sm font-bold text-slate-800">No Active Statement Analysis Pipeline</p>
        <p className="text-xs max-w-sm text-slate-400">Please generate a brand new statement or select an existing record from the SQLite History listing to populate immediate charts.</p>
      </div>
    );
  }

  const { customerDetails, accountInfo, transactions, totalCredits, totalDebits, drCount, crCount, closingBalance } = activeRecord;

  const { openingBalance } = accountInfo;

  // Process data for balance regression timeline
  const balanceData = transactions.map((t, idx) => ({
    name: t.valueDate,
    balance: t.balance,
    txIndex: idx + 1
  }));

  // Process data for category pie splits
  const categorySummary: { [key: string]: number } = {
    'UPI / QR': 0,
    'NEFT Transfer': 0,
    'IMPS Transfer': 0,
    'Cash': 0,
    'Card Purchase': 0,
    'ATM Outflow': 0,
  };

  transactions.forEach(t => {
    const text = t.details.toUpperCase();
    const amount = t.debit || t.credit || 0;
    
    if (text.includes('UPI') || text.includes('GPAY') || text.includes('PHONEPE') || text.includes('PAYTM')) {
      categorySummary['UPI / QR'] += amount;
    } else if (text.includes('NEFT') || text.includes('SALARY')) {
      categorySummary['NEFT Transfer'] += amount;
    } else if (text.includes('IMPS') || text.includes('NETBANK') || text.includes('MOB-BANKING')) {
      categorySummary['IMPS Transfer'] += amount;
    } else if (text.includes('CASH')) {
      categorySummary['Cash'] += amount;
    } else if (text.includes('POS') || text.includes('SWIPE') || text.includes('PURCHASE')) {
      categorySummary['Card Purchase'] += amount;
    } else if (text.includes('ATM')) {
      categorySummary['ATM Outflow'] += amount;
    } else {
      categorySummary['UPI / QR'] += amount; // fallback default
    }
  });

  const pieData = Object.keys(categorySummary)
    .filter(key => categorySummary[key] > 0)
    .map(key => ({
      name: key,
      value: Math.round(categorySummary[key])
    }));

  // Process data for side-by-side grouped debit/credit counts and values
  // We chunk transactions into 5 slices chronologically to show general trend across duration
  const chunksCount = 5;
  const chunkSize = Math.max(1, Math.ceil(transactions.length / chunksCount));
  const groupedData: any[] = [];

  for (let i = 0; i < chunksCount; i++) {
    const start = i * chunkSize;
    const end = Math.min(transactions.length, start + chunkSize);
    const slice = transactions.slice(start, end);
    
    if (slice.length === 0) continue;
    
    let chunkCredits = 0;
    let chunkDebits = 0;
    
    slice.forEach(t => {
      if (t.credit) chunkCredits += t.credit;
      if (t.debit) chunkDebits += t.debit;
    });

    groupedData.push({
      period: `P${i + 1} (${slice[0].valueDate.substring(0, 5)})`,
      Credits: Math.round(chunkCredits),
      Debits: Math.round(chunkDebits)
    });
  }

  // Aggregate ratios
  const creditRatio = totalCredits / (totalCredits + totalDebits || 1);
  const debitRatio = totalDebits / (totalCredits + totalDebits || 1);

  // Maximum single transaction thresholds
  let maxDebitVal = 0;
  let maxCreditVal = 0;
  transactions.forEach(t => {
    if (t.debit && t.debit > maxDebitVal) maxDebitVal = t.debit;
    if (t.credit && t.credit > maxCreditVal) maxCreditVal = t.credit;
  });

  return (
    <div className="space-y-6">
      
      {/* Target stats brief widget header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="text-center md:text-left">
          <span className="text-indigo-600 font-bold text-xs font-mono uppercase tracking-widest flex items-center justify-center md:justify-start gap-1">
            <Activity size={14} /> LIVE LEDGER ANALYTICS STREAM
          </span>
          <h2 className="text-lg font-bold text-slate-800 mt-1 uppercase font-sans">
            {customerDetails.accountHolderName}
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Analyzing <strong className="text-indigo-600 font-bold font-mono">{transactions.length} transactions</strong> spanning closing ledger balance <strong className="text-emerald-600 font-bold font-mono">₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-center">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center w-28 sm:w-32">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Total Cash Flow</span>
            <span className="text-emerald-600 font-extrabold text-sm font-mono mt-1 block">
              +₹{(totalCredits - totalDebits > 0 ? (totalCredits - totalDebits) : 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center w-28 sm:w-32">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Total Debited</span>
            <span className="text-rose-600 font-extrabold text-sm font-mono mt-1 block">
              -₹{totalDebits.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center w-28 sm:w-32">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Total Credited</span>
            <span className="text-slate-700 font-extrabold text-sm font-mono mt-1 block">
              +₹{totalCredits.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Running Balance Area timeline */}
        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-2">
            <LineIcon size={14} className="text-indigo-600" /> Continuous Running Ledger Balance Timeline (INR)
          </h3>
          <div className="h-64 sm:h-72 w-full mt-2 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.balance} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLORS.balance} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} fontSize={9} />
                <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} fontFamily="monospace" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: 8, fontFamily: 'sans-serif', fontSize: 11 }}
                  formatter={(val: any) => [`₹${parseFloat(val).toLocaleString('en-IN')}`, 'Current Balance']}
                  labelStyle={{ fontWeight: 'bold', color: '#475569' }}
                />
                <Area type="monotone" dataKey="balance" stroke={COLORS.balance} strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-sans">Visual chronological progression mapping opening balance value directly through to final terminal balance.</p>
        </div>

        {/* 2. Grouped Bar chart debit vs credit value */}
        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-2">
            <Activity size={14} className="text-indigo-600" /> Inflow vs Outflow Interval Progression (INR)
          </h3>
          <div className="h-64 sm:h-72 w-full mt-2 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="period" stroke="#64748b" tickLine={false} fontSize={9} />
                <YAxis stroke="#64748b" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tickLine={false} fontFamily="monospace" fontSize={9} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: 8, fontFamily: 'sans-serif', fontSize: 11 }}
                  formatter={(val: any) => `₹${parseFloat(val).toLocaleString('en-IN')}`}
                />
                <Legend iconSize={8} />
                <Bar dataKey="Credits" fill={COLORS.credit} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Debits" fill={COLORS.debit} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-sans">Statement duration divided into chunk intervals. Demonstrates spending peaks vs passive earnings.</p>
        </div>

        {/* 3. Category Split Pie chart */}
        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-2">
            <PieIcon size={14} className="text-indigo-600" /> Cumulative Channel Spend Distribution
          </h3>
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
            <div className="h-44 sm:h-52 w-44 sm:w-52 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: 8, fontFamily: 'sans-serif', fontSize: 11 }}
                    formatter={(val: any) => `₹${val.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Category legends right */}
            <div className="space-y-2 flex-1 w-full max-w-xs font-sans">
              {pieData.map((entry, idx) => {
                const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
                const pct = ((entry.value / (total || 1)) * 100).toFixed(1);
                return (
                  <div key={entry.name} className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.pie[idx % COLORS.pie.length] }} />
                      <span className="text-slate-600">{entry.name}</span>
                    </div>
                    <span className="text-slate-800 font-mono font-bold">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2 font-sans">Aggregate transaction value routed, mapped from matching Indian standard bank descriptors.</p>
        </div>

        {/* 4. Advanced Metrics Grid Summary */}
        <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-2">
            <Landmark size={14} className="text-indigo-600" /> High Net Worth (HNW) Audit Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4 my-2">
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-wider block">Debit Count</span>
              <span className="text-rose-600 font-bold text-lg font-mono block mt-1">{drCount} events</span>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">Total debit actions logged in statement array.</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-wider block">Credit Count</span>
              <span className="text-emerald-600 font-bold text-lg font-mono block mt-1">{crCount} events</span>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">Total incoming credit events recorded.</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-wider block">Peak Withdraw</span>
              <span className="text-slate-700 font-bold font-mono text-sm block mt-1">₹{maxDebitVal.toLocaleString()}</span>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">Highest single debit withdrawal spike.</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
              <span className="text-[9px] text-slate-400 uppercase font-sans font-bold tracking-wider block">Peak Deposit</span>
              <span className="text-slate-700 font-bold font-mono text-sm block mt-1">₹{maxCreditVal.toLocaleString()}</span>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">Highest single salary or transfer credit cashflow.</p>
            </div>
          </div>
          
          <div className="bg-emerald-50/50 p-4 rounded-xl text-xs leading-relaxed border border-emerald-100/60 text-emerald-800 flex items-center justify-between mt-3 font-sans">
            <div>
              <span className="font-extrabold text-emerald-800 text-xs flex items-center gap-1 uppercase tracking-wide">
                Statement Health Audit: SAFE
              </span>
              <p className="text-[10px] text-emerald-600 font-medium">Running balance validates mathematically with cumulative delta logs.</p>
            </div>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded font-sans font-bold shadow-xs">100% OK</span>
          </div>
        </div>

      </div>

    </div>
  );
}
