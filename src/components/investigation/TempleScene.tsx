/** 案卷原创装饰视觉：弧形知识论坛（椭透视环形柱廊＋中央拱亭＋雕像檐顶＋阶梯广场）。
 *  纯装饰图层：无文本、aria-hidden、pointer-events 关闭，不承载任何状态或操作语义。
 *  坐标按透视公式生成并保留一位小数（rendering-svg-precision）。 */

const CX = 720;
const BACK_BASE = 318;      // 最深处柱础 y
const SIDE_BASE = 374;      // 近侧柱础 y
const RX = 566;             // 柱廊椭圆半径
const CAPITAL = 10;

interface Column { x: number; base: number; h: number; w: number; t: number }

function buildColumns(): Column[] {
  const list: Column[] = [];
  for (let angle = 197; angle >= -17; angle -= 13.2) {
    const rad = (angle * Math.PI) / 180;
    const depth = (1 - Math.sin(rad)) / 2;      // 0 最远 → 1 最近
    const x = CX + RX * Math.cos(rad);
    const base = BACK_BASE + (SIDE_BASE - BACK_BASE) * depth;
    const h = 118 + 58 * depth;
    list.push({ x: Math.round(x * 10) / 10, base: Math.round(base * 10) / 10, h: Math.round(h * 10) / 10, w: Math.round(h * 0.17 * 10) / 10, t: Math.round(depth * 100) / 100 });
  }
  return list.sort((a, b) => a.t - b.t);
}
const columns = buildColumns();
const tops = columns.map((c) => ({ x: c.x, y: Math.round((c.base - c.h - CAPITAL) * 10) / 10 }));
const atticLine = tops.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y - 15}`).join(" ");
const architrave = tops.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

export function TempleScene() {
  return (
    <svg viewBox="0 0 1440 460" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tf-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fefefc" stopOpacity="0" />
          <stop offset="0.12" stopColor="#fefefc" stopOpacity="0.55" />
          <stop offset="0.28" stopColor="#fefefc" stopOpacity="1" />
          <stop offset="1" stopColor="#fefefc" stopOpacity="1" />
        </linearGradient>
        <mask id="tf-mask"><rect x="0" y="0" width="1440" height="460" fill="url(#tf-fade)" /></mask>
        <radialGradient id="tf-floor" cx="0.5" cy="0.72" r="0.6">
          <stop offset="0" stopColor="#e7ece6" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#f7f6f3" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f7f6f3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tf-shaft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#faf9f6" />
          <stop offset="1" stopColor="#f0eee9" />
        </linearGradient>
      </defs>

      <g mask="url(#tf-mask)">
        {/* 后排柱廊下的柔和鼠尾草阴影 */}
        <ellipse cx={CX} cy={BACK_BASE + 12} rx="540" ry="11" fill="#e7ece6" opacity="0.55" />

        {/* 环形阶梯广场（近 → 远） */}
        <ellipse cx={CX} cy="424" rx="656" ry="40" fill="#f7f6f3" stroke="#e5e1db" strokeWidth="1" />
        <ellipse cx={CX} cy="420" rx="574" ry="34" fill="#ffffff" stroke="#e5e1db" strokeWidth="1" />
        <ellipse cx={CX} cy="416" rx="492" ry="28" fill="#f7f6f3" stroke="#e8e4dd" strokeWidth="1" />
        <ellipse cx={CX} cy="412" rx="410" ry="22" fill="#ffffff" stroke="#e8e4dd" strokeWidth="1" />
        <ellipse cx={CX} cy="408" rx="328" ry="17" fill="#f7f6f3" stroke="#ece9e3" strokeWidth="1" />
        {/* 中央甬道与广场心徽 */}
        <ellipse cx={CX} cy="406" rx="42" ry="9" fill="#f2eadf" stroke="#c4a16e" strokeWidth="1" opacity="0.9" />
        <line x1={CX - 5} y1="452" x2={CX - 5} y2="408" stroke="#e5e1db" strokeWidth="1" />
        <line x1={CX + 5} y1="452" x2={CX + 5} y2="408" stroke="#e5e1db" strokeWidth="1" />

        {/* 环形柱廊：远 → 近 */}
        {columns.map((c) => {
          const fill = c.t < 0.3 ? "#ffffff" : "url(#tf-shaft)";
          const stroke = c.t < 0.3 ? "#d8d2c6" : "#cec7b9";
          return (
            <g key={`${c.x}-${c.t}`}>
              <rect x={c.x - c.w / 2 - 4} y={c.base - c.h - CAPITAL} width={c.w + 8} height="4" fill="#ffffff" stroke={stroke} strokeWidth="1" />
              <rect x={c.x - c.w / 2 - 2} y={c.base - c.h - CAPITAL + 4} width={c.w + 4} height={CAPITAL - 4} fill="#ffffff" stroke={stroke} strokeWidth="1" />
              <rect x={c.x - c.w / 2} y={c.base - c.h} width={c.w} height={c.h} fill={fill} stroke={stroke} strokeWidth="1" />
              <line x1={c.x - c.w / 6} y1={c.base - c.h + 6} x2={c.x - c.w / 6} y2={c.base - 5} stroke="#eae6de" strokeWidth="1" />
              <line x1={c.x + c.w / 6} y1={c.base - c.h + 6} x2={c.x + c.w / 6} y2={c.base - 5} stroke="#eae6de" strokeWidth="1" />
              <rect x={c.x - c.w / 2 - 2.5} y={c.base - 5} width={c.w + 5} height="5" fill="#fdfcfa" stroke={stroke} strokeWidth="1" />
            </g>
          );
        })}

        {/* 弯曲檐口与檐上矮墙 */}
        <path d={architrave} fill="none" stroke="#cec7b9" strokeWidth="1.6" />
        <path d={atticLine} fill="none" stroke="#d8d2c6" strokeWidth="1" />
        {/* 檐上雕像（瓶形剪影＋金色顶珠） */}
        {tops.filter((_, index) => index % 3 === 1).map((p) => (
          <g key={`statue-${p.x}`}>
            <line x1={p.x} y1={p.y - 15} x2={p.x} y2={p.y - 24} stroke="#d8d2c6" strokeWidth="1" />
            <path d={`M ${p.x - 2.4} ${p.y - 24} L ${p.x - 1.4} ${p.y - 33} A 2.6 3.2 0 0 1 ${p.x + 1.4} ${p.y - 33} L ${p.x + 2.4} ${p.y - 24} Z`} fill="#ffffff" stroke="#cfc8bb" strokeWidth="1" />
            <circle cx={p.x} cy={p.y - 38.5} r="1.6" fill="#c4a16e" opacity="0.85" />
          </g>
        ))}

        {/* 中央拱亭（最深处）：双层拱圈、藻井、鎏金拱心石 */}
        <g>
          <path d={`M ${CX - 88} ${BACK_BASE + 6} L ${CX - 88} 228 A 88 88 0 0 1 ${CX + 88} 228 L ${CX + 88} ${BACK_BASE + 6} Z`} fill="#ffffff" stroke="#d8d2c6" strokeWidth="1.5" />
          <path d={`M ${CX - 72} ${BACK_BASE + 6} L ${CX - 72} 232 A 72 72 0 0 1 ${CX + 72} 232 L ${CX + 72} ${BACK_BASE + 6}`} fill="none" stroke="#e5e0d7" strokeWidth="1" />
          <path d={`M ${CX - 56} ${BACK_BASE + 6} L ${CX - 56} 236 A 56 56 0 0 1 ${CX + 56} 236 L ${CX + 56} ${BACK_BASE + 6}`} fill="none" stroke="#ece8e0" strokeWidth="1" />
          {[-135, -105, -75, -45, -15, 15, 45, 75, 105, 135].map((a) => {
            const rad = (a * Math.PI) / 180;
            return <line key={a} x1={Math.round((CX + Math.cos(rad) * 34) * 10) / 10} y1={Math.round((244 - Math.sin(rad) * 34) * 10) / 10} x2={Math.round((CX + Math.cos(rad) * 58) * 10) / 10} y2={Math.round((244 - Math.sin(rad) * 58) * 10) / 10} stroke="#ece8e0" strokeWidth="1" />;
          })}
          <path d={`M ${CX - 7} 138 L ${CX + 7} 138 L ${CX + 10} 158 L ${CX - 10} 158 Z`} fill="#ffffff" stroke="#c4a16e" strokeWidth="1.4" />
          <circle cx={CX} cy="196" r="4.5" fill="none" stroke="#c4a16e" strokeWidth="1.1" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
}
