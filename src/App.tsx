import React, { useState, useMemo } from 'react';
import { 
  Car, 
  Bus, 
  Beef, 
  Utensils, 
  Zap, 
  Flame, 
  Plane, 
  GlassWater, 
  Leaf, 
  ArrowRight, 
  TrendingDown, 
  Plus, 
  Trash2,
  ChevronRight,
  Info,
  Sparkles,
  Loader2,
  Droplets,
  ShoppingBag,
  BookOpen,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { ACTIVITIES, RECOMMENDATIONS } from './constants';
import { Activity, UserActivity, FootprintResult } from './types';
import { getAIRecommendations, AIInsightsResponse, parseJournalEntry } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_COLORS: Record<string, string> = {
  transport: '#6366f1', // indigo
  food: '#ef4444',      // red
  energy: '#f59e0b',    // amber
  lifestyle: '#10b981', // emerald
};

const ICON_MAP: Record<string, React.ReactNode> = {
  Car: <Car size={20} />,
  Bus: <Bus size={20} />,
  Beef: <Beef size={20} />,
  Utensils: <Utensils size={20} />,
  Zap: <Zap size={20} />,
  Flame: <Flame size={20} />,
  Plane: <Plane size={20} />,
  GlassWater: <GlassWater size={20} />,
  Droplets: <Droplets size={20} />,
  ShoppingBag: <ShoppingBag size={20} />,
};

export default function App() {
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>(ACTIVITIES[0].id);
  const [inputValue, setInputValue] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<AIInsightsResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal'>('dashboard');
  const [journalText, setJournalText] = useState('');
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [journalEntries, setJournalEntries] = useState<{ id: string; text: string; date: string }[]>([]);

  const handleProcessJournal = async () => {
    if (!journalText.trim()) return;
    setIsJournalLoading(true);
    try {
      const parsed = await parseJournalEntry(journalText);
      if (parsed.length > 0) {
        setJournalEntries(prev => [
          { id: crypto.randomUUID(), text: journalText, date: new Date().toISOString() },
          ...prev
        ]);
        setUserActivities(prev => {
          const newActivities = [...prev];
          parsed.forEach(p => {
            const existing = newActivities.find(a => a.activityId === p.activityId);
            if (existing) {
              existing.value += p.value;
            } else {
              newActivities.push(p);
            }
          });
          return newActivities;
        });
        setJournalText('');
        setActiveTab('dashboard');
      }
    } catch (error) {
      console.error("Failed to parse journal", error);
    } finally {
      setIsJournalLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    if (userActivities.length === 0) return;
    setIsAiLoading(true);
    try {
      const insights = await getAIRecommendations(userActivities);
      setAiInsights(insights);
    } catch (error) {
      console.error("Failed to fetch AI insights", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddActivity = () => {
    const value = parseFloat(inputValue);
    if (isNaN(value) || value <= 0) return;

    setUserActivities(prev => {
      const existing = prev.find(a => a.activityId === selectedActivityId);
      if (existing) {
        return prev.map(a => 
          a.activityId === selectedActivityId 
            ? { ...a, value: a.value + value } 
            : a
        );
      }
      return [...prev, { activityId: selectedActivityId, value }];
    });
    setInputValue('');
  };

  const handleRemoveActivity = (id: string) => {
    setUserActivities(prev => prev.filter(a => a.activityId !== id));
  };

  const results = useMemo((): FootprintResult => {
    const byCategory: Record<string, number> = {
      transport: 0,
      food: 0,
      energy: 0,
      lifestyle: 0,
    };
    let total = 0;
    const savings: FootprintResult['savings'] = [];

    userActivities.forEach(ua => {
      const activity = ACTIVITIES.find(a => a.id === ua.activityId);
      if (!activity) return;

      const emission = ua.value * activity.emissionFactor;
      total += emission;
      byCategory[activity.category] += emission;

      // Find recommendations
      const rec = RECOMMENDATIONS.find(r => r.activityId === ua.activityId);
      if (rec) {
        const reducedEmission = ua.value * rec.alternativeFactor;
        savings.push({
          activityId: ua.activityId,
          original: emission,
          reduced: reducedEmission,
          potentialSaving: emission - reducedEmission,
          recommendation: rec.description,
        });
      }
    });

    return { total, byCategory, savings };
  }, [userActivities]);

  const chartData = useMemo(() => {
    return Object.entries(results.byCategory)
      .filter(([_, value]) => (value as number) > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: parseFloat((value as number).toFixed(2)),
        color: CATEGORY_COLORS[name],
      }));
  }, [results]);

  const totalPotentialSavings = results.savings.reduce((acc, s) => acc + s.potentialSaving, 0);

  const comparisonData = useMemo(() => [
    {
      name: 'Current',
      value: parseFloat(results.total.toFixed(2)),
      fill: '#6366f1'
    },
    {
      name: 'Potential',
      value: parseFloat((results.total - totalPotentialSavings).toFixed(2)),
      fill: '#10b981'
    }
  ], [results.total, totalPotentialSavings]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Leaf size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CarbonPath</h1>
              <p className="text-slate-500 text-sm">Track and reduce your daily impact</p>
            </div>
          </div>

          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all",
                activeTab === 'dashboard' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('journal')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all",
                activeTab === 'journal' ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <BookOpen size={18} />
              Journal
            </button>
          </div>

          <div className="hidden lg:block text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Date</p>
            <p className="font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </header>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input & Activities */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus size={20} className="text-emerald-500" />
                Add Daily Activity
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Activity Type</label>
                  <select 
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 focus:border-emerald-500 transition-all"
                  >
                    {ACTIVITIES.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                    Amount ({ACTIVITIES.find(a => a.id === selectedActivityId)?.unit})
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g. 10"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-20 focus:border-emerald-500 transition-all"
                    />
                    <button 
                      onClick={handleAddActivity}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[300px]">
              <h2 className="text-lg font-semibold mb-4">Today's Log</h2>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {userActivities.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 text-slate-400"
                    >
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info size={24} />
                      </div>
                      <p>No activities logged yet.</p>
                      <p className="text-sm">Add your first activity above.</p>
                    </motion.div>
                  ) : (
                    userActivities.map(ua => {
                      const activity = ACTIVITIES.find(a => a.id === ua.activityId)!;
                      return (
                        <motion.div 
                          key={ua.activityId}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm",
                              activity.category === 'transport' && "bg-indigo-500",
                              activity.category === 'food' && "bg-red-500",
                              activity.category === 'energy' && "bg-amber-500",
                              activity.category === 'lifestyle' && "bg-emerald-500",
                            )}>
                              {ICON_MAP[activity.icon]}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{activity.name}</p>
                              <p className="text-xs text-slate-500">{ua.value} {activity.unit} • {(ua.value * activity.emissionFactor).toFixed(2)} kg CO2</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveActivity(ua.activityId)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </section>
          </div>

          {/* Right Column: Results & Recommendations */}
          <div className="lg:col-span-7 space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <TrendingDown size={120} />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-1">Total Footprint</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-5xl font-bold">{results.total.toFixed(1)}</h3>
                  <span className="text-slate-400 font-medium">kg CO2e</span>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-400 bg-opacity-10 w-fit px-3 py-1 rounded-full">
                  <TrendingDown size={14} />
                  <span>Daily Average: 12.5 kg</span>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Potential Savings</p>
                  <div className="flex items-baseline gap-2 text-emerald-600">
                    <h3 className="text-5xl font-bold">-{totalPotentialSavings.toFixed(1)}</h3>
                    <span className="text-emerald-600/60 font-medium">kg CO2e</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  By switching to the recommended alternatives, you could reduce your daily footprint by <span className="text-emerald-600 font-bold">{results.total > 0 ? ((totalPotentialSavings / results.total) * 100).toFixed(0) : 0}%</span>.
                </p>
              </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold mb-6">Impact by Category</h2>
                <div className="h-[240px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                      Add activities to see distribution
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold mb-6">Current vs. Potential</h2>
                <div className="h-[240px] w-full">
                  {results.total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]} 
                          barSize={60}
                        >
                          {comparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">
                      Add activities to see comparison
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* AI Insights Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles size={20} className="text-violet-500" />
                    CarbonPath Insights
                  </h2>
                  <button 
                    onClick={fetchAIInsights}
                    disabled={isAiLoading || userActivities.length === 0}
                    className="text-xs font-bold text-violet-600 hover:text-violet-700 disabled:text-slate-300 transition-colors flex items-center gap-1"
                  >
                    {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {aiInsights ? 'Refresh' : 'Generate'}
                  </button>
                </div>
                
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
                      <Loader2 size={32} className="text-violet-500 animate-spin" />
                      <p className="text-sm text-slate-500 animate-pulse">Analyzing your footprint...</p>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-6">
                      {/* Score & Summary */}
                      <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              className="text-slate-200"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={226}
                              strokeDashoffset={226 - (226 * aiInsights.score) / 100}
                              className={cn(
                                "transition-all duration-1000 ease-out",
                                aiInsights.score > 70 ? "text-emerald-500" : 
                                aiInsights.score > 40 ? "text-amber-500" : "text-red-500"
                              )}
                            />
                          </svg>
                          <span className="absolute text-xl font-bold">{aiInsights.score}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Eco Score</p>
                          <p className="text-sm text-slate-700 leading-relaxed italic">"{aiInsights.summary}"</p>
                        </div>
                      </div>

                      {/* Challenge */}
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <TrendingDown size={48} />
                        </div>
                        <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <TrendingDown size={14} />
                          Today's Eco-Challenge
                        </h4>
                        <p className="text-sm text-slate-800 font-medium">{aiInsights.dailyChallenge}</p>
                      </div>

                      {/* Recommendations */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommendations</h4>
                        {aiInsights.recommendations.map((rec, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm group hover:shadow-md transition-shadow"
                          >
                            <div className="h-32 w-full overflow-hidden relative">
                              <img 
                                src={`https://loremflickr.com/400/225/${rec.visualKeyword}?lock=${idx}`}
                                alt={rec.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-2 right-2">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm",
                                  rec.impact === 'high' ? "bg-red-500 text-white" : 
                                  rec.impact === 'medium' ? "bg-amber-500 text-white" : 
                                  "bg-emerald-500 text-white"
                                )}>
                                  {rec.impact} Impact
                                </span>
                              </div>
                            </div>
                            <div className="p-4">
                              <h4 className="text-sm font-bold text-slate-900 mb-1">{rec.title}</h4>
                              <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">{rec.description}</p>
                              <div className="flex items-center justify-between">
                                <div className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                                  Save {rec.estimatedSaving}
                                </div>
                                <button className="text-xs font-bold text-slate-400 group-hover:text-emerald-500 flex items-center gap-1 transition-colors">
                                  Details <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      {userActivities.length === 0 
                        ? "Log activities to get AI-powered recommendations." 
                        : "Click 'Generate' for personalized AI insights."}
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Quick Journal</h2>
                    <p className="text-slate-500 text-xs">Describe your day to calculate footprint</p>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-4">
                  <textarea 
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Example: I drove 20km today and had a vegetarian lunch..."
                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-20 focus:border-violet-500 transition-all resize-none text-sm text-slate-700"
                  />
                  <button 
                    onClick={handleProcessJournal}
                    disabled={isJournalLoading || !journalText.trim()}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:shadow-none"
                  >
                    {isJournalLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    Process Journal
                  </button>
                </div>
              </section>
            </div>

            {/* Detailed Savings Table */}
            {results.savings.length > 0 && (
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 overflow-hidden">
                <h2 className="text-lg font-semibold mb-6">Impact Comparison</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Activity</th>
                        <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Current</th>
                        <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Alternative</th>
                        <th className="pb-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Saving</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.savings.map((saving, idx) => {
                        const activity = ACTIVITIES.find(a => a.id === saving.activityId)!;
                        const rec = RECOMMENDATIONS.find(r => r.activityId === saving.activityId)!;
                        return (
                          <tr key={idx} className="group hover:bg-slate-50 hover:bg-opacity-50 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                  {ICON_MAP[activity.icon]}
                                </div>
                                <span className="font-medium text-sm">{activity.name}</span>
                              </div>
                            </td>
                            <td className="py-4 text-sm text-slate-600">{saving.original.toFixed(2)} kg</td>
                            <td className="py-4">
                              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                                <span>{rec.alternativeName}</span>
                                <ArrowRight size={14} />
                                <span>{saving.reduced.toFixed(2)} kg</span>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                -{saving.potentialSaving.toFixed(2)} kg
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Daily Eco-Journal</h2>
                  <p className="text-slate-500 text-sm">Describe your day and let AI calculate your footprint.</p>
                </div>
              </div>

              <div className="space-y-4">
                <textarea 
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="Example: Today I drove 15km to the office. For lunch, I had a beef burger. I also bought a new pair of shoes and used about 100 liters of water for a long shower..."
                  className="w-full h-48 bg-slate-50 border border-slate-200 rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-20 focus:border-violet-500 transition-all resize-none text-slate-700 leading-relaxed"
                />
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Info size={14} />
                    AI will extract activities like transport, meals, and shopping.
                  </p>
                  <button 
                    onClick={handleProcessJournal}
                    disabled={isJournalLoading || !journalText.trim()}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-violet-200 flex items-center gap-2 disabled:bg-slate-200 disabled:shadow-none"
                  >
                    {isJournalLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Sparkles size={20} />
                    )}
                    Process Journal
                  </button>
                </div>
              </div>
            </section>

            {journalEntries.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 px-2">
                  <History size={20} className="text-slate-400" />
                  Recent Entries
                </h3>
                <div className="space-y-4">
                  {journalEntries.map((entry) => (
                    <motion.div 
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">"{entry.text}"</p>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                <h3 className="font-bold text-emerald-800 mb-2">How it works</h3>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  Our AI uses Gemini 3.1 Pro to parse your natural language and map it to specific carbon-emitting activities. It's the easiest way to log your day without manual entry.
                </p>
              </div>
              <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                <h3 className="font-bold text-indigo-800 mb-2">Tips for accuracy</h3>
                <p className="text-sm text-indigo-700 leading-relaxed">
                  Include quantities like distances (km), types of meals (beef, chicken, plant-based), and specific items purchased for the best results.
                </p>
              </div>
            </section>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-sm">
          <p>© 2026 CarbonPath • Making sustainability simple.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-emerald-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Data Sources</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
