import React, { useMemo, useState, useRef, WheelEvent, MouseEvent } from 'react';
import { MindMapNode } from '../types';

// --- Configuration ---
const nodeHeight = 50;
const nodeWidth = 160;
const verticalGap = 50;
const horizontalGap = 40;
const padding = 40;

// --- Interfaces for Layout Algorithm ---
interface LayoutNode {
  node: MindMapNode;
  children: LayoutNode[];
  parent: LayoutNode | null;
  x: number;      // Relative x position to its parent
  y: number;      // Absolute y position
  finalX: number; // Final absolute x position after all calculations
  width: number;  // The width of the entire subtree rooted at this node
  height: number;
}

// --- New, Robust Tree Layout Algorithm ---

/**
 * Calculates the layout for a tree structure in two passes.
 * 1. A post-order traversal (firstWalk) to determine the relative position of nodes.
 * 2. A pre-order traversal (secondWalk) to calculate the final absolute coordinates.
 */
function simpleTreeLayout(root: MindMapNode): { nodes: LayoutNode[]; width: number; height: number } {
  const layoutRoot = buildLayoutTree(root);
  firstWalk(layoutRoot);
  const { minX, maxX, maxY } = secondWalk(layoutRoot, 0, { minX: 0, maxX: 0, maxY: 0 });

  const nodes: LayoutNode[] = [];
  const queue = [layoutRoot];
  while (queue.length > 0) {
    const node = queue.shift()!;
    // Normalize coordinates to be positive and add padding
    node.finalX = node.finalX - minX + padding;
    node.y = node.y + padding;
    nodes.push(node);
    queue.push(...node.children);
  }

  const width = maxX - minX + padding * 2;
  const height = maxY + nodeHeight + padding * 2;

  return { nodes, width, height };
}

/**
 * Builds the initial tree structure used by the layout algorithm.
 */
function buildLayoutTree(node: MindMapNode, parent: LayoutNode | null = null, depth: number = 0): LayoutNode {
  const layoutNode: LayoutNode = {
    node,
    parent,
    children: [],
    x: 0,
    y: depth * (nodeHeight + verticalGap),
    width: nodeWidth,
    height: nodeHeight,
    finalX: 0,
  };
  layoutNode.children = (node.children || []).map(child => buildLayoutTree(child, layoutNode, depth + 1));
  return layoutNode;
}

/**
 * Post-order traversal to set initial X positions relative to the parent.
 * This ensures that subtrees do not overlap.
 */
function firstWalk(node: LayoutNode) {
  if (node.children.length === 0) {
    return;
  }

  node.children.forEach(firstWalk);

  // Position children relative to the parent node
  const totalChildrenWidth = node.children.reduce((acc, child) => acc + child.width, 0) + (node.children.length - 1) * horizontalGap;
  
  let currentX = -totalChildrenWidth / 2;
  for (const child of node.children) {
    child.x = currentX + child.width / 2;
    currentX += child.width + horizontalGap;
  }
  
  node.width = Math.max(nodeWidth, totalChildrenWidth);
}

/**
 * Pre-order traversal to calculate the final absolute X position for each node.
 */
function secondWalk(node: LayoutNode, parentX: number, bounds: { minX: number, maxX: number, maxY: number }) {
  node.finalX = parentX + node.x;

  // Update overall bounds of the drawing
  bounds.minX = Math.min(bounds.minX, node.finalX - nodeWidth / 2);
  bounds.maxX = Math.max(bounds.maxX, node.finalX + nodeWidth / 2);
  bounds.maxY = Math.max(bounds.maxY, node.y);

  node.children.forEach(child => secondWalk(child, node.finalX, bounds));
  return bounds;
}


// --- React Component ---

const MindMapView: React.FC<{ mindMap: MindMapNode }> = ({ mindMap }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 }); // k is scale
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes: nodePositions, width: totalWidth, height: totalHeight } = useMemo(() => {
    if (!mindMap) return { nodes: [], width: 0, height: 0 };
    return simpleTreeLayout(mindMap);
  }, [mindMap]);

  if (!mindMap) {
    return <p className="text-center text-slate-500">No mind map available.</p>;
  }

  const lines = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; }[] = [];
    nodePositions.forEach(parentPos => {
      parentPos.children.forEach(childNode => {
        result.push({
          x1: parentPos.finalX,
          y1: parentPos.y + parentPos.height,
          x2: childNode.finalX,
          y2: childNode.y,
        });
      });
    });
    return result;
  }, [nodePositions]);

  const handleWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const { clientX, clientY, deltaY } = e;
    const scaleFactor = 1.1;
    const newScale = deltaY < 0 ? transform.k * scaleFactor : transform.k / scaleFactor;
    const clampedScale = Math.max(0.2, Math.min(newScale, 3));

    const point = new DOMPoint(clientX, clientY);
    const transformedPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
    
    const dx = transformedPoint.x - transform.x;
    const dy = transformedPoint.y - transform.y;
    
    const newX = transformedPoint.x - (dx * clampedScale) / transform.k;
    const newY = transformedPoint.y - (dy * clampedScale) / transform.k;
    
    setTransform({ x: newX, y: newY, k: clampedScale });
  };
  
  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.style.cursor = 'grabbing';
  };
  
  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    const dx = (e.clientX - panStart.current.x) / transform.k;
    const dy = (e.clientY - panStart.current.y) / transform.k;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    panStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = (e: MouseEvent<SVGSVGElement>) => {
    isPanning.current = false;
    e.currentTarget.style.cursor = 'grab';
  };

  return (
    <div className="w-full h-[600px] border rounded-lg bg-slate-50 overflow-hidden">
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            style={{ cursor: 'grab' }}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        >
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                {lines.map((line, index) => (
                    <path
                        key={index}
                        d={`M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + verticalGap / 2}, ${line.x2} ${line.y2 - verticalGap / 2}, ${line.x2} ${line.y2}`}
                        stroke="#94a3b8"
                        strokeWidth="2"
                        fill="none"
                    />
                ))}
                {nodePositions.map(({ finalX, y, node }, index) => (
                    <g key={index} transform={`translate(${finalX - nodeWidth / 2}, ${y})`}>
                        <rect
                            width={nodeWidth}
                            height={nodeHeight}
                            rx="8"
                            fill="#f8fafc"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                        />
                         <foreignObject x="5" y="5" width={nodeWidth - 10} height={nodeHeight - 10}>
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    color: '#334155',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    lineHeight: '1.2',
                                    padding: '2px',
                                    userSelect: 'none',
                                    overflowWrap: 'break-word',
                                }}
                            >
                                {node.topic}
                            </div>
                        </foreignObject>
                    </g>
                ))}
            </g>
        </svg>
    </div>
  );
};

export default MindMapView;