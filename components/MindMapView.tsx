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
  x: number;
  y: number;
  modifier: number; // Offset to be applied to the node and its children
  thread?: LayoutNode; // Link to the next node on the contour
  width: number;
  height: number;
}

// --- Reingold-Tilford Algorithm Implementation ---

/**
 * A simplified implementation of the Reingold-Tilford algorithm for creating tidy tree layouts.
 * It works in two passes:
 * 1. firstWalk (post-order traversal): Calculates initial positions and modifiers to avoid subtree conflicts.
 * 2. secondWalk (pre-order traversal): Applies the modifiers to calculate the final node positions.
 */
function buchheim(root: MindMapNode): { nodes: LayoutNode[]; width: number; height: number } {
  const layoutRoot = buildLayoutTree(root);
  firstWalk(layoutRoot);
  const { minX, maxX, maxY } = secondWalk(layoutRoot, 0, 0, { minX: 0, maxX: 0, maxY: 0 });

  const nodes: LayoutNode[] = [];
  const queue = [layoutRoot];
  while (queue.length > 0) {
    const node = queue.shift()!;
    // Adjust coordinates to be positive and add padding
    node.x = node.x - minX + padding;
    node.y = node.y + padding;
    nodes.push(node);
    queue.push(...node.children);
  }

  const width = maxX - minX + padding * 2;
  const height = maxY + padding * 2;

  return { nodes, width, height };
}

function buildLayoutTree(node: MindMapNode, parent: LayoutNode | null = null): LayoutNode {
  const layoutNode: LayoutNode = {
    node,
    parent,
    children: [],
    x: 0,
    y: 0,
    modifier: 0,
    width: nodeWidth,
    height: nodeHeight,
  };
  layoutNode.children = (node.children || []).map(child => buildLayoutTree(child, layoutNode));
  return layoutNode;
}

function firstWalk(node: LayoutNode) {
  if (node.children.length === 0) {
    return;
  }

  node.children.forEach(firstWalk);

  let defaultAncestor = node.children[0];
  for (const child of node.children) {
    apportion(child, defaultAncestor);
    defaultAncestor = nextRight(child);
  }

  executeShifts(node);

  const midpoint = (node.children[0].x + node.children[node.children.length - 1].x) / 2;
  
  // Center parent over children
  const leftChild = node.children[0];
  const rightChild = node.children[node.children.length - 1];
  
  let shift = midpoint - (rightChild.x - leftChild.x) / 2;
  if(node.parent) {
      const sibling = getLeftSibling(node);
      if(sibling) {
          const desiredSeparation = nodeWidth + horizontalGap;
          const currentSeparation = node.x - sibling.x;
          if(currentSeparation < desiredSeparation) {
               node.modifier += desiredSeparation - currentSeparation;
          }
      }
  }


  node.x = midpoint;
}

function apportion(node: LayoutNode, defaultAncestor: LayoutNode) {
    const leftSibling = getLeftSibling(node);
    if(leftSibling) {
        let contourRight = node;
        let contourLeft = leftSibling;
        let contourInnerRight = nextRight(contourRight);
        let contourInnerLeft = nextLeft(contourLeft);
        let shift = 0;
        while(contourInnerLeft && contourInnerRight) {
             const distance = (contourLeft.x + shift) - contourRight.x;
             if(distance + nodeWidth + horizontalGap > 0) {
                 shift += distance + nodeWidth + horizontalGap;
             }
             contourRight = nextRight(contourRight);
             contourLeft = nextLeft(contourLeft);
             if(!contourRight || !contourLeft) break;
             contourInnerRight = nextRight(contourRight);
             contourInnerLeft = nextLeft(contourLeft);
        }
        if(shift > 0) {
            let ancestor = node;
            while(ancestor && ancestor !== defaultAncestor) {
                ancestor.x += shift;
                ancestor.modifier += shift;
                ancestor = ancestor.parent!;
            }
        }
    }
}

function executeShifts(node: LayoutNode) {
    let shift = 0, change = 0;
    for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        child.x += shift;
        child.modifier += shift;
        change += child.modifier;
        shift += child.modifier + change;
    }
}


function secondWalk(node: LayoutNode, mod: number, depth: number, bounds: { minX: number, maxX: number, maxY: number }) {
  node.x += mod;
  node.y = depth * (nodeHeight + verticalGap);

  bounds.minX = Math.min(bounds.minX, node.x);
  bounds.maxX = Math.max(bounds.maxX, node.x + nodeWidth);
  bounds.maxY = Math.max(bounds.maxY, node.y + nodeHeight);

  node.children.forEach(child => secondWalk(child, mod + node.modifier, depth + 1, bounds));
  return bounds;
}

const getLeftSibling = (node: LayoutNode) => node.parent?.children.find((_, i) => node.parent!.children[i+1] === node) || null;
const nextRight = (node: LayoutNode) => node.children?.[node.children.length - 1] ?? node.thread;
const nextLeft = (node: LayoutNode) => node.children?.[0] ?? node.thread;

// --- React Component ---

const MindMapView: React.FC<{ mindMap: MindMapNode }> = ({ mindMap }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 }); // k is scale
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes: nodePositions, width: totalWidth, height: totalHeight } = useMemo(() => {
    if (!mindMap) return { nodes: [], width: 0, height: 0 };
    return buchheim(mindMap);
  }, [mindMap]);

  if (!mindMap) {
    return <p className="text-center text-slate-500">No mind map available.</p>;
  }

  const lines = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; }[] = [];
    nodePositions.forEach(parentPos => {
      parentPos.children.forEach(childNode => {
        result.push({
          x1: parentPos.x + parentPos.width / 2,
          y1: parentPos.y + parentPos.height,
          x2: childNode.x + childNode.width / 2,
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
                {nodePositions.map(({ x, y, width, height, node }, index) => (
                    <g key={index} transform={`translate(${x}, ${y})`}>
                        <rect
                            width={width}
                            height={height}
                            rx="8"
                            fill="#f8fafc"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                        />
                         <foreignObject x="5" y="5" width={width - 10} height={height - 10}>
                            {/* Fix: Removed the 'xmlns' attribute from the div as it is not a valid prop for HTML elements in React and causes a TypeScript error. The browser will render it correctly inside a foreignObject without it. */}
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
