interface BattleshipSuperstructureProps {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export default function BattleshipSuperstructure({ width, height, offsetX, offsetY }: BattleshipSuperstructureProps) {
  const scale = width / 500;
  
  return (
    <g transform={`translate(${offsetX}, ${offsetY})`}>
      <g transform={`translate(${width * 0.15}, ${height * 0.3})`}>
        <rect x={-8 * scale} y={-6 * scale} width={16 * scale} height={12 * scale} fill="#475569" stroke="#64748b" strokeWidth="1" />
        <rect x={8 * scale} y={-2 * scale} width={20 * scale} height={4 * scale} fill="#334155" stroke="#475569" strokeWidth="0.5" />
        <text x={0} y={2 * scale} fontSize={6 * scale} fill="#94a3b8" textAnchor="middle">I</text>
      </g>
      <g transform={`translate(${width * 0.22}, ${height * 0.25})`}>
        <rect x={-8 * scale} y={-6 * scale} width={16 * scale} height={12 * scale} fill="#475569" stroke="#64748b" strokeWidth="1" />
        <rect x={8 * scale} y={-2 * scale} width={20 * scale} height={4 * scale} fill="#334155" stroke="#475569" strokeWidth="0.5" />
        <text x={0} y={2 * scale} fontSize={6 * scale} fill="#94a3b8" textAnchor="middle">II</text>
      </g>
      <g transform={`translate(${width * 0.35}, ${height * 0.15})`}>
        <rect x={-15 * scale} y={0} width={30 * scale} height={25 * scale} fill="#475569" stroke="#64748b" strokeWidth="1" />
        <rect x={-10 * scale} y={-15 * scale} width={20 * scale} height={15 * scale} fill="#334155" stroke="#475569" strokeWidth="1" />
        <rect x={-8 * scale} y={-25 * scale} width={16 * scale} height={10 * scale} fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <line x1={0} y1={-25 * scale} x2={0} y2={-35 * scale} stroke="#64748b" strokeWidth="1" />
        <line x1={-5 * scale} y1={-30 * scale} x2={5 * scale} y2={-30 * scale} stroke="#64748b" strokeWidth="0.5" />
        <text x={0} y={10 * scale} fontSize={5 * scale} fill="#94a3b8" textAnchor="middle">МОСТИК</text>
      </g>
      {[0, 1, 2, 3].map((i) => (
        <g key={`smokestack-${i}`} transform={`translate(${width * (0.42 + i * 0.05)}, ${height * 0.2})`}>
          <rect x={-4 * scale} y={-20 * scale} width={8 * scale} height={20 * scale} fill="#334155" stroke="#475569" strokeWidth="1" />
          <ellipse cx={0} cy={-20 * scale} rx={4 * scale} ry={2 * scale} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
        </g>
      ))}
      <g transform={`translate(${width * 0.65}, ${height * 0.25})`}>
        <rect x={-12 * scale} y={0} width={24 * scale} height={20 * scale} fill="#475569" stroke="#64748b" strokeWidth="1" />
        <rect x={-8 * scale} y={-10 * scale} width={16 * scale} height={10 * scale} fill="#334155" stroke="#475569" strokeWidth="1" />
        <text x={0} y={8 * scale} fontSize={5 * scale} fill="#94a3b8" textAnchor="middle">КДП</text>
      </g>
      <g transform={`translate(${width * 0.78}, ${height * 0.3})`}>
        <rect x={-8 * scale} y={-6 * scale} width={16 * scale} height={12 * scale} fill="#475569" stroke="#64748b" strokeWidth="1" />
        <rect x={-28 * scale} y={-2 * scale} width={20 * scale} height={4 * scale} fill="#334155" stroke="#475569" strokeWidth="0.5" />
        <text x={0} y={2 * scale} fontSize={6 * scale} fill="#94a3b8" textAnchor="middle">III</text>
      </g>
      <g transform={`translate(${width * 0.72}, ${height * 0.35})`}>
        <line x1={0} y1={0} x2={10 * scale} y2={-8 * scale} stroke="#64748b" strokeWidth="1" />
        <line x1={10 * scale} y1={-8 * scale} x2={10 * scale} y2={0} stroke="#64748b" strokeWidth="0.5" />
      </g>
    </g>
  );
}
