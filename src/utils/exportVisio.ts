import type { FlowNode, FlowEdge } from '../types';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fillColor(type: string): string {
  const m: Record<string, string> = {
    Start:'#d5f5e3', Task:'#dfe6e9', Menu:'#fef9c3',
    switch:'#fff3e0', decision:'#fff3e0',
    transferToAcd:'#e8eaf6', transferToFlow:'#e8eaf6',
    transferToNumber:'#e8eaf6', transferToFlowSecure:'#e8eaf6',
    disconnect:'#fdecea', endTask:'#fdecea',
    jumpToTask:'#f3e5f5', callTask:'#f3e5f5', callCommonModule:'#e0f7fa',
    playAudio:'#e3f2fd', dataTableLookup:'#f9f0ff', updateData:'#e8f5e9',
  };
  return m[type] ?? '#ffffff';
}

function borderColor(type: string): string {
  const m: Record<string, string> = {
    Start:'#27ae60', Task:'#636e72', Menu:'#f39c12',
    switch:'#e67e22', decision:'#e67e22',
    transferToAcd:'#3f51b5', transferToFlow:'#3f51b5',
    transferToNumber:'#3f51b5', transferToFlowSecure:'#3f51b5',
    disconnect:'#c0392b', endTask:'#c0392b',
    jumpToTask:'#7b1fa2', callTask:'#7b1fa2', callCommonModule:'#00838f',
    playAudio:'#1565c0', dataTableLookup:'#6a1b9a', updateData:'#2e7d32',
  };
  return m[type] ?? '#546e7a';
}

// Export as draw.io XML — opens in diagrams.net (free) and can be
// re-exported to .vsdx from inside that app (File → Export As → VSDX).
export function exportToDrawio(
  nodes: FlowNode[],
  edges: FlowEdge[],
  filename = 'callflow.drawio'
): void {
  if (!nodes.length) throw new Error('No diagram to export');

  // Stable integer IDs (draw.io cells 0 & 1 are reserved)
  const idMap = new Map<string, number>();
  nodes.forEach((n, i) => idMap.set(n.id, i + 2));
  let nextId = nodes.length + 2;

  const cells: string[] = [
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>',
  ];

  // Node cells
  nodes.forEach(n => {
    const id = idMap.get(n.id)!;
    const x  = n.position?.x ?? 0;
    const y  = n.position?.y ?? 0;
    const w  = n.type === 'taskNode' ? 320 : 280;
    const h  = n.type === 'taskNode' ? 140 : 120;
    const fill   = fillColor(n.data.type);
    const stroke = borderColor(n.data.type);
    const bold   = n.type === 'taskNode' ? 'fontStyle=1;fontSize=13;' : 'fontSize=11;';
    const style  = `rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=${fill};strokeColor=${stroke};strokeWidth=2;${bold}`;
    const label  = esc(`[${n.data.type}]\n${n.data.label}`);

    cells.push(
      `<mxCell id="${id}" value="${label}" style="${style}" vertex="1" parent="1">` +
      `<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`
    );
  });

  // Edge cells
  edges.forEach(e => {
    const src = idMap.get(e.source);
    const tgt = idMap.get(e.target);
    if (!src || !tgt) return;
    const id    = nextId++;
    const label = e.label ? esc(String(e.label)) : '';
    const dashed = e.animated ? 'dashed=1;' : '';
    const style = `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;` +
                  `exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;${dashed}`;
    cells.push(
      `<mxCell id="${id}" value="${label}" style="${style}" edge="1" source="${src}" target="${tgt}" parent="1">` +
      `<mxGeometry relative="1" as="geometry"/></mxCell>`
    );
  });

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<mxGraphModel grid="0" pageWidth="1654" pageHeight="2338">\n` +
    `  <root>\n    ` +
    cells.join('\n    ') +
    `\n  </root>\n</mxGraphModel>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
