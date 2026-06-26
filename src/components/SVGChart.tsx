/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChartDataPoint } from '../types';

interface SVGChartProps {
  data: ChartDataPoint[];
  color?: string;
  gradientId: string;
  valueSuffix?: string;
}

export const SVGChart: React.FC<SVGChartProps> = ({
  data,
  color = '#8b5cf6', // default violet
  gradientId,
  valueSuffix = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs font-mono bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
        <span>No hay datos históricos cargados</span>
      </div>
    );
  }

  // Padding & Dimensions
  const paddingLeft = 50;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 30;
  
  const width = 560;
  const height = 200;

  // Find min/max for scale
  const values = data.map((d) => d.value);
  const rawMax = Math.max(...values, 10);
  const maxValue = Math.ceil(rawMax * 1.15); // Add 15% head room for curves
  const minValue = 0; 

  const rangeY = maxValue - minValue;

  // Map to SVG coordinates
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / Math.max(1, data.length - 1)) * (width - paddingLeft - paddingRight);
    // Safety check against zero divisions
    const ratioY = rangeY > 0 ? (d.value - minValue) / rangeY : 0.5;
    const y = height - paddingBottom - ratioY * (height - paddingTop - paddingBottom);
    return { x, y, label: d.label, value: d.value };
  });

  // Generate smooth Bezier curve path
  const getSmoothPath = (pts: typeof points) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      // Generate beautiful control points at 1/3 and 2/3 distance
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const linePath = getSmoothPath(points);
  
  // Close path for beautiful gradient area
  let areaPath = '';
  if (points.length > 0 && linePath) {
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baselineY = height - paddingBottom;
    areaPath = `${linePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }

  return (
    <div className="w-full select-none" id={`chart-container-${gradientId}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        id={`chart-svg-${gradientId}`}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
          <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal grid lines with fine ticks */}
        {[0, 0.33, 0.66, 1].map((ratio, i) => {
          const y = paddingTop + ratio * (height - paddingTop - paddingBottom);
          const gridVal = Math.round(maxValue - ratio * rangeY);
          return (
            <g key={i} className="opacity-80 transition-all">
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="rgba(0, 0, 0, 0.06)"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 10}
                y={y + 3.5}
                textAnchor="end"
                className="fill-slate-500 font-mono text-[9px] font-medium tracking-tight"
              >
                {gridVal % 1 === 0 ? gridVal.toLocaleString() : gridVal.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Interactive Vertical Guidance line on hover */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <line
            x1={points[hoveredIdx].x}
            y1={paddingTop - 5}
            x2={points[hoveredIdx].x}
            y2={height - paddingBottom}
            stroke={color}
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeDasharray="3 3"
            className="transition-all duration-150"
          />
        )}

        {/* Elegant Area under curve */}
        {areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Breathtaking smooth cubic line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow-effect)"
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Anchor point rings & interactives */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g 
              key={idx} 
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
            >
              {/* Giant invisible trigger circle for mobile hit targets */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="16"
                fill="transparent"
              />

              {/* Glowing outer aura rings on hover */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? "9" : "4"}
                fill={color}
                fillOpacity={isHovered ? "0.15" : "0"}
                stroke={color}
                strokeOpacity={isHovered ? "0.3" : "0"}
                strokeWidth={isHovered ? "1.5" : "0"}
                className="transition-all duration-200"
              />

              {/* Main solid anchor point */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? "5.5" : "4"}
                fill={isHovered ? "#fff" : color}
                stroke="#ffffff"
                strokeWidth={isHovered ? "2.5" : "2"}
                className="transition-all duration-200"
              />
            </g>
          );
        })}

        {/* Elegant tooltip box floating on the SVG */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <g className="transition-all duration-150 pointer-events-none">
            {/* Tooltip background shadow box */}
            <rect
              x={Math.max(10, Math.min(width - 120, points[hoveredIdx].x - 55))}
              y={points[hoveredIdx].y - 38}
              width="110"
              height="28"
              rx="6"
              fill="#ffffff"
              stroke={color}
              strokeWidth="1.5"
              strokeOpacity="0.8"
              className="filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            />
            <text
              x={Math.max(65, Math.min(width - 65, points[hoveredIdx].x))}
              y={points[hoveredIdx].y - 20}
              textAnchor="middle"
              className="fill-slate-700 font-mono text-[10px] font-bold"
            >
              {points[hoveredIdx].label}: <tspan fill={color} className="font-extrabold">{points[hoveredIdx].value.toLocaleString()}{valueSuffix}</tspan>
            </text>
          </g>
        )}

        {/* X Axis Labels with premium line ticks */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g key={idx}>
              <line
                x1={pt.x}
                y1={height - paddingBottom}
                x2={pt.x}
                y2={height - paddingBottom + 4}
                stroke="rgba(0, 0, 0, 0.08)"
                strokeWidth="1"
              />
              <text
                x={pt.x}
                y={height - 10}
                textAnchor="middle"
                className={`font-sans text-[10px] font-bold tracking-tight transition-all uppercase ${
                  isHovered ? 'fill-violet-600 font-extrabold scale-105' : 'fill-slate-400'
                }`}
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

