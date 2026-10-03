/* ============================================================
   品牌矢量标志库 —— 高校学术印章 · 机构标识 · 会议徽票
   全部为内联 SVG，随主题缩放清晰渲染，无需外链图片资源
   ============================================================ */
import React from 'react';

const SERIF = 'Georgia, "Times New Roman", "Noto Serif SC", "Source Han Serif SC", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

/* ---------- 高校双环学术印章 ---------- */
const Seal: React.FC<{ color: string; text: string; size?: number }> = ({ color, text, size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="#FFFFFF" />
    <circle cx="20" cy="20" r="18.3" fill="none" stroke={color} strokeWidth="1.7" />
    <circle cx="20" cy="20" r="14.4" fill="none" stroke={color} strokeWidth="0.7" opacity="0.55" />
    <text
      x="20" y="20.6" textAnchor="middle" dominantBaseline="central"
      fontFamily={SERIF} fontWeight="700" fill={color}
      fontSize={text.length >= 3 ? 9 : 12.5} letterSpacing={text.length >= 3 ? 0.4 : 1.5}
    >
      {text}
    </text>
  </svg>
);

/* ---------- 机构标识 ---------- */
const MsraLogo: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.4" y="2.4" width="8.7" height="8.7" rx="1.2" fill="#F25022" />
    <rect x="12.9" y="2.4" width="8.7" height="8.7" rx="1.2" fill="#7FBA00" />
    <rect x="2.4" y="12.9" width="8.7" height="8.7" rx="1.2" fill="#00A4EF" />
    <rect x="12.9" y="12.9" width="8.7" height="8.7" rx="1.2" fill="#FFB900" />
  </svg>
);

const DamoLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <rect x="2" y="2" width="36" height="36" rx="10.5" fill="#FF6A00" />
    <rect x="2" y="2" width="36" height="36" rx="10.5" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
    <text x="20" y="21.4" textAnchor="middle" dominantBaseline="central" fontFamily={SERIF} fontWeight="800" fontSize="17" fill="#FFFFFF">达</text>
  </svg>
);

const TencentLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <rect x="2" y="2" width="36" height="36" rx="10.5" fill="#0052D9" />
    <text x="20" y="21" textAnchor="middle" dominantBaseline="central" fontFamily={SANS} fontWeight="800" fontSize="13.5" letterSpacing="0.5" fill="#FFFFFF">AI</text>
  </svg>
);

/* ---------- 会议 / 期刊徽票（深墨字标 + 学科色徽记） ---------- */
interface ConfProps {
  w: number;
  label: string;
  textX: number;
  fontSize?: number;
  serif?: boolean;
  accent: React.ReactNode;
  size?: number;
}

const Conf: React.FC<ConfProps> = ({ w, label, textX, fontSize = 10.5, serif = false, accent, size = 28 }) => (
  <svg width={(w / 30) * size} height={size} viewBox={`0 0 ${w} 30`} aria-hidden="true">
    <rect x="0.6" y="0.6" width={w - 1.2} height="28.8" rx="8" fill="#1C2A22" />
    <rect x="0.6" y="0.6" width={w - 1.2} height="28.8" rx="8" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
    {accent}
    <text
      x={textX} y="15.6" dominantBaseline="central"
      fontFamily={serif ? SERIF : SANS} fontStyle={serif ? 'italic' : 'normal'}
      fontWeight="800" fontSize={fontSize} letterSpacing="0.5" fill="#F2EFE6"
    >
      {label}
    </text>
  </svg>
);

/* ---------- 标志注册表 ---------- */
const LOGOS: Record<string, React.FC<{ size?: number }>> = {
  /* 高校印章（采用各校标志性校色） */
  thu: (p) => <Seal color="#5E0D8C" text="清华" {...p} />,
  pku: (p) => <Seal color="#94070A" text="北大" {...p} />,
  casia: (p) => <Seal color="#005BAB" text="中科院" {...p} />,
  zju: (p) => <Seal color="#003F8A" text="浙大" {...p} />,
  sjtu: (p) => <Seal color="#AA1F24" text="交大" {...p} />,
  ustc: (p) => <Seal color="#003C7E" text="中科大" {...p} />,
  fudan: (p) => <Seal color="#1F4E8C" text="复旦" {...p} />,

  /* 机构标识 */
  msra: MsraLogo,
  damo: DamoLogo,
  tencent: TencentLogo,

  /* 会议徽票 */
  cvpr: (p) => (
    <Conf w={62} label="CVPR" textX={25} fontSize={11}
      accent={<><circle cx="13.5" cy="15" r="6.4" fill="none" stroke="#F0632C" strokeWidth="2.2" /><circle cx="13.5" cy="15" r="2.4" fill="#F0632C" /></>} {...p} />
  ),
  neurips: (p) => (
    <Conf w={72} label="NeurIPS" textX={21} fontSize={10}
      accent={<><circle cx="12" cy="9.8" r="2.3" fill="#9B72F2" /><circle cx="8.8" cy="15.6" r="2.3" fill="#5B8DEF" /><circle cx="15.2" cy="15.6" r="2.3" fill="#E4573D" /></>} {...p} />
  ),
  icml: (p) => (
    <Conf w={58} label="ICML" textX={27}
      accent={<><circle cx="11.5" cy="15" r="5.2" fill="none" stroke="#5B8DEF" strokeWidth="2" /><circle cx="17.2" cy="15" r="5.2" fill="none" stroke="#C2762B" strokeWidth="2" /></>} {...p} />
  ),
  acl: (p) => (
    <Conf w={50} label="ACL" textX={22}
      accent={<><path d="M8.5 11.5a6.5 6.5 0 0 1 0 7" stroke="#5B8DEF" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M12 9.3a10 10 0 0 1 0 11.4" stroke="#5B8DEF" strokeWidth="2" fill="none" opacity="0.5" strokeLinecap="round" /></>} {...p} />
  ),
  acmmm: (p) => (
    <Conf w={70} label="ACM MM" textX={23} fontSize={9.5}
      accent={<><circle cx="10" cy="10.6" r="2.4" fill="#E4573D" /><circle cx="16.6" cy="10.6" r="2.4" fill="#5B8DEF" /><circle cx="10" cy="17.2" r="2.4" fill="#C2762B" /><circle cx="16.6" cy="17.2" r="2.4" fill="#1B7A5E" /></>} {...p} />
  ),
  tpami: (p) => (
    <Conf w={64} label="TPAMI" textX={21} fontSize={9.5}
      accent={<rect x="8.2" y="11.2" width="7.6" height="7.6" rx="1.3" transform="rotate(45 12 15)" fill="#00629B" />} {...p} />
  ),
  nmi: (p) => (
    <Conf w={78} label="Nature MI" textX={19} fontSize={10.5} serif
      accent={<path d="M11 10.2l1.2 2.5 2.7.3-2 1.9.5 2.7-2.4-1.4-2.4 1.4.5-2.7-2-1.9 2.7-.3z" fill="#B9891E" />} {...p} />
  ),
  scirobo: (p) => (
    <Conf w={104} label="Science Robotics" textX={21} fontSize={9.5} serif
      accent={<><circle cx="12" cy="15" r="5" fill="none" stroke="#D5542C" strokeWidth="2.2" /><circle cx="12" cy="15" r="1.8" fill="#D5542C" /></>} {...p} />
  ),
};

export default function BrandLogo({ id, size = 28 }: { id: string; size?: number }) {
  const Logo = LOGOS[id];
  if (!Logo) return null;
  return <Logo size={size} />;
}
