import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Simulation: React.FC = () => {
    const [rainfall, setRainfall] = useState(50); // mm
    const [riverLevel, setRiverLevel] = useState(4.5); // meters
    const [soilMoisture, setSoilMoisture] = useState(60); // %
    const [predictionData, setPredictionData] = useState<any[]>([]);
    const [riskLevel, setRiskLevel] = useState('Low');

    // Simulate prediction calculation
    useEffect(() => {
        const data = [];
        // Adjusted formula for more dramatic effect
        const baseRisk = (rainfall * 0.3) + (riverLevel * 8) + (soilMoisture * 0.15);

        for (let i = 0; i < 24; i++) {
            // Simulate 24 hour projection with some randomness and curve
            const hourRisk = baseRisk + (Math.sin(i / 4) * 15) + (i * (rainfall / 150));
            data.push({
                hour: `+${i}h`,
                risk: Math.min(100, Math.max(0, hourRisk)),
                threshold: 75
            });
        }
        setPredictionData(data);

        // Determine overall risk
        const maxRisk = Math.max(...data.map(d => d.risk));
        if (maxRisk > 85) setRiskLevel('Critical');
        else if (maxRisk > 65) setRiskLevel('High');
        else if (maxRisk > 45) setRiskLevel('Moderate');
        else setRiskLevel('Low');

    }, [rainfall, riverLevel, soilMoisture]);

    const getRiskBg = (level: string) => {
        switch (level) {
            case 'Critical': return 'bg-red-50 border-red-100 text-red-700';
            case 'High': return 'bg-orange-50 border-orange-100 text-orange-700';
            case 'Moderate': return 'bg-yellow-50 border-yellow-100 text-yellow-700';
            default: return 'bg-green-50 border-green-100 text-green-700';
        }
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 text-center"
                >
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                        Flood Scenario <span className="text-blue-600">Simulator</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Adjust environmental parameters to simulate potential flood risks.
                        <span className="block text-sm mt-2 text-slate-400 font-medium">
                            *For educational and planning purposes only.
                        </span>
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Controls Panel */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Risk Indicator Card */}
                        <motion.div
                            layout
                            className={`p-6 rounded-2xl border-2 shadow-sm transition-colors duration-500 ${getRiskBg(riskLevel)}`}
                        >
                            <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 mb-1">Projected Risk Level</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-4xl font-black tracking-tight">{riskLevel}</span>
                            </div>
                        </motion.div>

                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    Parameters
                                </h2>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Rainfall Slider */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            Rainfall Intensity
                                        </label>
                                        <span className="text-2xl font-bold text-blue-600">{rainfall}<span className="text-sm text-slate-400 font-normal ml-1">mm</span></span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="200"
                                        value={rainfall}
                                        onChange={(e) => setRainfall(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
                                    />
                                    <div className="flex justify-between text-xs font-medium text-slate-400">
                                        <span>Light Rain</span>
                                        <span>Extreme Storm</span>
                                    </div>
                                </div>

                                {/* River Level Slider */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            River Level
                                        </label>
                                        <span className="text-2xl font-bold text-cyan-600">{riverLevel}<span className="text-sm text-slate-400 font-normal ml-1">m</span></span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={riverLevel}
                                        onChange={(e) => setRiverLevel(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-600 hover:accent-cyan-500 transition-all"
                                    />
                                    <div className="flex justify-between text-xs font-medium text-slate-400">
                                        <span>Normal</span>
                                        <span>Overflowing</span>
                                    </div>
                                </div>

                                {/* Soil Moisture Slider */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            Soil Moisture
                                        </label>
                                        <span className="text-2xl font-bold text-emerald-600">{soilMoisture}<span className="text-sm text-slate-400 font-normal ml-1">%</span></span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={soilMoisture}
                                        onChange={(e) => setSoilMoisture(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 hover:accent-emerald-500 transition-all"
                                    />
                                    <div className="flex justify-between text-xs font-medium text-slate-400">
                                        <span>Dry</span>
                                        <span>Saturated</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visualization Panel */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">24-Hour Risk Projection</h2>
                                    <p className="text-sm text-slate-500">Real-time simulation based on current parameters</p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                        <span className="text-slate-600 font-medium">Risk Index</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full border border-red-500 border-dashed"></span>
                                        <span className="text-slate-600 font-medium">Critical Threshold</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={predictionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={riskLevel === 'Critical' ? '#ef4444' : '#3b82f6'} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={riskLevel === 'Critical' ? '#ef4444' : '#3b82f6'} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="hour"
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={[0, 100]}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                            }}
                                            itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="risk"
                                            stroke={riskLevel === 'Critical' ? '#ef4444' : '#3b82f6'}
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorRisk)"
                                            animationDuration={1000}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="threshold"
                                            stroke="#ef4444"
                                            strokeDasharray="4 4"
                                            strokeWidth={2}
                                            fill="none"
                                            dot={false}
                                            activeDot={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Simulation;
