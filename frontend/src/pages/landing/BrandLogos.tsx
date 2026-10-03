import React from 'react';

const SOURCES: Record<string, { file: string; wide?: boolean }> = {
  thu: { file: 'thu.png', wide: true },
  pku: { file: 'pku.png' },
  zju: { file: 'zju.ico' },
  sjtu: { file: 'sjtu.png' },
  ustc: { file: 'ustc.svg', wide: true },
  fudan: { file: 'fudan.ico' },
  neurips: { file: 'neurips.svg', wide: true },
  icml: { file: 'icml.svg', wide: true },
};

/** 原始官方标识保存在 public/brands，来源见同目录 SOURCES.md。 */
export default function BrandLogo({ id, name }: { id: string; name: string }) {
  const source = SOURCES[id];
  if (!source) return null;
  return <img src={`/brands/${source.file}`} alt={name} className={`brand-logo${source.wide ? ' brand-logo-wide' : ''}`} width={source.wide ? 125 : 36} height={36} loading="eager" decoding="async" />;
}
