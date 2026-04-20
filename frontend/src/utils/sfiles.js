export function parseSFILES(notation) {
  if (!notation || typeof notation !== 'string') return [];

  const normalized = notation.replace(/->|=>/g, '→').trim();
  const segments = normalized.split(/→/).map((s) => s.trim()).filter(Boolean);

  return segments.map((seg, index) => {
    let type = 'unit';
    let label = seg;
    let params = [];

    const flow = seg.match(/^\(([^)]+)\)(.*)$/);
    const unit = seg.match(/^\{([^}]+)\}(.*)$/);
    const equip = seg.match(/^\[([^\]]+)\](.*)$/);

    if (flow) {
      type = 'flow';
      label = flow[1];
    } else if (unit) {
      type = 'unit';
      label = unit[1];
    } else if (equip) {
      type = 'equip';
      label = equip[1];
    }

    const parts = label.split('/').map((p) => p.trim()).filter(Boolean);
    const name = parts[0] || label;
    params = parts.slice(1);

    if (index === 0) type = 'feed';

    return { type, name, params, raw: seg };
  });
}
