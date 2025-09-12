import React, { useMemo, useState, useRef, WheelEvent, MouseEvent } from 'react';
import { MindMapNode } from '../types';
import { DownloadIcon } from './icons';

// --- Configuration ---
const nodeHeight = 50;
const verticalGap = 50;
const horizontalGap = 40;
const padding = 40;

// --- Interfaces for Layout Algorithm ---
interface LayoutNode {
  id: number;
  node: MindMapNode;
  children: LayoutNode[];
  parent: LayoutNode | null;
  x: number;      // Relative x position to its parent
  y: number;      // Absolute y position
  finalX: number; // Final absolute x position after all calculations
  width: number;  // The width of the entire subtree rooted at this node
  height: number;
}

// --- Robust Tree Layout Algorithm ---

function simpleTreeLayout(root: MindMapNode): { nodes: LayoutNode[]; width: number; height: number } {
  let idCounter = 0;
  
  function buildLayoutTree(node: MindMapNode, parent: LayoutNode | null = null, depth: number = 0): LayoutNode {
    // --- Dynamic Node Width Calculation ---
    const MIN_NODE_WIDTH = 80;
    const MAX_NODE_WIDTH = 220;
    const CHAR_WIDTH_MULTIPLIER = 8; // Approximation for 14px font
    const HORIZONTAL_PADDING = 20;
    
    // Fix: The 'node' parameter is of type MindMapNode, which has a 'topic' property directly.
    const calculatedWidth = node.topic.length * CHAR_WIDTH_MULTIPLIER + HORIZONTAL_PADDING;
    const dynamicNodeWidth = Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, calculatedWidth));
    // ---

    const layoutNode: LayoutNode = {
      id: idCounter++,
      node,
      parent,
      children: [],
      x: 0,
      y: depth * (nodeHeight + verticalGap),
      width: dynamicNodeWidth,
      height: nodeHeight,
      finalX: 0,
    };
    layoutNode.children = (node.children || []).map(child => buildLayoutTree(child, layoutNode, depth + 1));
    return layoutNode;
  }

  const layoutRoot = buildLayoutTree(root);
  
  firstWalk(layoutRoot);
  const { minX, maxX, maxY } = secondWalk(layoutRoot, 0, { minX: 0, maxX: 0, maxY: 0 });

  const nodes: LayoutNode[] = [];
  const queue = [layoutRoot];
  while (queue.length > 0) {
    const node = queue.shift()!;
    node.finalX = node.finalX - minX + padding;
    node.y = node.y + padding;
    nodes.push(node);
    queue.push(...node.children);
  }

  const width = maxX - minX + padding * 2;
  const height = maxY + nodeHeight + padding * 2;

  return { nodes, width, height };
}

function firstWalk(node: LayoutNode) {
  if (node.children.length === 0) return;
  node.children.forEach(firstWalk);
  const totalChildrenWidth = node.children.reduce((acc, child) => acc + child.width, 0) + (node.children.length - 1) * horizontalGap;
  let currentX = -totalChildrenWidth / 2;
  for (const child of node.children) {
    child.x = currentX + child.width / 2;
    currentX += child.width + horizontalGap;
  }
  node.width = Math.max(node.width, totalChildrenWidth);
}

function secondWalk(node: LayoutNode, parentX: number, bounds: { minX: number, maxX: number, maxY: number }) {
  node.finalX = parentX + node.x;
  bounds.minX = Math.min(bounds.minX, node.finalX - node.width / 2);
  bounds.maxX = Math.max(bounds.maxX, node.finalX + node.width / 2);
  bounds.maxY = Math.max(bounds.maxY, node.y);
  node.children.forEach(child => secondWalk(child, node.finalX, bounds));
  return bounds;
}

// --- React Component ---

const MindMapView: React.FC<{ mindMap: MindMapNode }> = ({ mindMap }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes: nodePositions, width: totalWidth, height: totalHeight } = useMemo(() => {
    if (!mindMap) return { nodes: [], width: 0, height: 0 };
    return simpleTreeLayout(mindMap);
  }, [mindMap]);
  
  const hoveredNode = hoveredNodeId !== null ? nodePositions.find(n => n.id === hoveredNodeId) : null;

  if (!mindMap) {
    return <p className="text-center text-slate-500">No mind map available.</p>;
  }
  
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    
    // Clone the SVG element to avoid modifying the one in the DOM
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;

    // --- Prepare the clone for clean export ---
    // 1. Remove interactive styles
    svgClone.style.cursor = 'default';

    // 2. Set explicit dimensions and namespace for better compatibility
    svgClone.setAttribute('width', totalWidth.toString());
    svgClone.setAttribute('height', totalHeight.toString());
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // 3. Remove the pan/zoom transform from the main group
    const g = svgClone.querySelector('g');
    if (g) {
      g.setAttribute('transform', ''); 
    }

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mindMap.topic.replace(/\s+/g, '_') || 'mind-map'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
    if (e.target !== e.currentTarget) return; // Prevent panning when clicking on nodes
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
    <div className="relative w-full h-[600px] border rounded-lg bg-slate-50 overflow-hidden">
        <button
          onClick={handleExportSvg}
          title="Export as SVG"
          className="absolute top-3 right-3 z-10 p-2 bg-white rounded-full shadow-md hover:bg-slate-100 transition-colors"
        >
          <DownloadIcon className="h-5 w-5 text-slate-600" />
        </button>
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
                {/* Lines */}
                {nodePositions.map((parentPos) =>
                    parentPos.children.map((childNode) => {
                        const isLineActive = hoveredNodeId === parentPos.id;
                        return (
                            <path
                                key={`line-${parentPos.id}-${childNode.id}`}
                                d={`M ${parentPos.finalX} ${parentPos.y + parentPos.height} C ${parentPos.finalX} ${parentPos.y + parentPos.height + verticalGap / 2}, ${childNode.finalX} ${childNode.y - verticalGap / 2}, ${childNode.finalX} ${childNode.y}`}
                                stroke={isLineActive ? '#60a5fa' : '#94a3b8'}
                                strokeWidth={isLineActive ? '3' : '2'}
                                fill="none"
                                className="transition-all duration-200"
                            />
                        );
                    })
                )}
                {/* Nodes */}
                {nodePositions.map((node) => {
                    const isHovered = hoveredNodeId === node.id;
                    const isChildOfHovered = hoveredNode !== null && node.parent?.id === hoveredNode.id;
                    return (
                        <g
                            key={node.id}
                            transform={`translate(${node.finalX - node.width / 2}, ${node.y})`}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            <rect
                                width={node.width}
                                height={nodeHeight}
                                rx="8"
                                fill="#f8fafc"
                                stroke={isHovered ? '#2563eb' : isChildOfHovered ? '#60a5fa' : '#cbd5e1'}
                                strokeWidth={isHovered || isChildOfHovered ? '2.5' : '1.5'}
                                className="transition-all duration-200"
                            />
                            <foreignObject x="5" y="5" width={node.width - 10} height={nodeHeight - 10}>
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
                                    {node.node.topic}
                                </div>
                            </foreignObject>
                        </g>
                    );
                })}
            </g>
        </svg>
    </div>
  );
};

export default MindMapView;