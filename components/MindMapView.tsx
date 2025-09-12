
import React from 'react';
import { MindMapNode } from '../types';

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  node: MindMapNode;
}

interface LinePosition {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const nodeHeight = 50;
const nodeWidth = 150;
const verticalGap = 40;
const horizontalGap = 50;
const padding = 20;

const calculateTreeLayout = (node: MindMapNode, x: number = 0, y: number = 0, level: number = 0, positions: Map<MindMapNode, { y: number; level: number }>, yOffset: number) => {
  let localY = y;
  if (positions.has(node)) {
    localY = positions.get(node)!.y;
  } else {
    localY = yOffset;
    positions.set(node, { y: localY, level });
    yOffset += nodeHeight + verticalGap;
  }

  if (node.children) {
    for (const child of node.children) {
      yOffset = calculateTreeLayout(child, x + nodeWidth + horizontalGap, localY, level + 1, positions, yOffset);
    }
  }

  return yOffset;
};

const assignPositions = (node: MindMapNode, level: number, positions: Map<MindMapNode, { y: number; level: number }>): NodePosition[] => {
  const pos = positions.get(node);
  if (!pos) return [];

  const x = level * (nodeWidth + horizontalGap) + padding;
  const y = pos.y + padding;
  let allPositions: NodePosition[] = [{ x, y, width: nodeWidth, height: nodeHeight, node }];

  if (node.children) {
    for (const child of node.children) {
      allPositions = [...allPositions, ...assignPositions(child, level + 1, positions)];
    }
  }

  return allPositions;
};


const MindMapView: React.FC<{ mindMap: MindMapNode }> = ({ mindMap }) => {
  if (!mindMap) {
    return <p className="text-center text-slate-500">No mind map available.</p>;
  }

  const positions = new Map<MindMapNode, { y: number; level: number }>();
  const totalHeight = calculateTreeLayout(mindMap, 0, 0, 0, positions, 0);

  const nodePositions = assignPositions(mindMap, 0, positions);
  
  const lines: LinePosition[] = [];
  nodePositions.forEach(parentPos => {
    if (parentPos.node.children) {
      parentPos.node.children.forEach(childNode => {
        const childPos = nodePositions.find(p => p.node === childNode);
        if (childPos) {
          lines.push({
            x1: parentPos.x + parentPos.width,
            y1: parentPos.y + parentPos.height / 2,
            x2: childPos.x,
            y2: childPos.y + childPos.height / 2,
          });
        }
      });
    }
  });
  
  const maxLevel = Math.max(...Array.from(positions.values()).map(p => p.level));
  const totalWidth = (maxLevel + 1) * (nodeWidth + horizontalGap) + padding * 2;


  return (
    <div className="w-full overflow-x-auto">
        <svg width={totalWidth} height={totalHeight + padding * 2}>
            {lines.map((line, index) => (
                <path
                    key={index}
                    d={`M ${line.x1} ${line.y1} C ${line.x1 + horizontalGap / 2} ${line.y1}, ${line.x2 - horizontalGap / 2} ${line.y2}, ${line.x2} ${line.y2}`}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    fill="none"
                />
            ))}
            {nodePositions.map(({ x, y, width, height, node }, index) => (
                <g key={index} transform={`translate(${x}, ${y})`}>
                    <rect
                        width={width}
                        height={height}
                        rx="8"
                        fill="#f1f5f9"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                    />
                    <text
                        x={width / 2}
                        y={height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#475569"
                        fontSize="14"
                        fontWeight="500"
                        style={{ userSelect: 'none' }}
                    >
                        {/* Poor man's text wrapping */}
                        {node.topic.length > 20 ? `${node.topic.substring(0, 18)}...` : node.topic}
                    </text>
                </g>
            ))}
        </svg>
    </div>
  );
};

export default MindMapView;