import React, { useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { NoteTagIndexEntry, TagType, tagMeta } from '../utils/tagSearch';

interface GraphViewProps {
  notes: NoteTagIndexEntry[];
  onOpenNote: (path: string) => void;
}

type GraphNodeType = 'root' | 'tag' | 'file';

interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  tagType?: TagType;
  path?: string;
  count?: number;
}

interface GraphLink {
  source: string;
  target: string;
  kind: 'root' | 'file';
}

const graphTypes: TagType[] = ['topic', 'person', 'object'];

const nodeColor = '#E2E8F0';
const labelCache = new Map<string, THREE.Sprite>();

const buildTreeGraph = (notes: NoteTagIndexEntry[], activeType: TagType) => {
  const rootId = `root:${activeType}`;
  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  nodeMap.set(rootId, {
    id: rootId,
    label: tagMeta[activeType].label,
    type: 'root',
    tagType: activeType,
  });

  notes.forEach((note) => {
    note.tags[activeType].forEach((tag) => {
      const tagNodeId = `${activeType}:${tag}`;
      const fileNodeId = `file:${note.path}`;

      if (!nodeMap.has(tagNodeId)) {
        nodeMap.set(tagNodeId, {
          id: tagNodeId,
          label: `${tagMeta[activeType].marker}${tag}`,
          type: 'tag',
          tagType: activeType,
          count: 0,
        });
        links.push({ source: rootId, target: tagNodeId, kind: 'root' });
      }

      const tagNode = nodeMap.get(tagNodeId);
      if (tagNode) {
        tagNode.count = (tagNode.count || 0) + 1;
      }

      if (!nodeMap.has(fileNodeId)) {
        nodeMap.set(fileNodeId, {
          id: fileNodeId,
          label: note.title,
          type: 'file',
          path: note.path,
        });
      }

      links.push({ source: tagNodeId, target: fileNodeId, kind: 'file' });
    });
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links,
  };
};

const createTextSprite = (text: string, color = nodeColor) => {
  const cacheKey = `${text}:${color}`;
  const cached = labelCache.get(cacheKey);
  if (cached) return cached.clone();

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = 448;
  canvas.height = 112;

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '800 32px Pretendard, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(32, 8, 1);
  labelCache.set(cacheKey, sprite);
  return sprite.clone();
};

const createNodeObject = (node: GraphNode) => {
  const group = new THREE.Group();

  if (node.type === 'root') {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(8.4, 36, 36),
      new THREE.MeshStandardMaterial({
        color: nodeColor,
        roughness: 0.5,
        metalness: 0.05,
      }),
    );
    group.add(core);

    const label = createTextSprite(node.label);
    label.position.z = 16;
    group.add(label);

    return group;
  }

  if (node.type === 'tag') {
    const count = node.count || 0;
    const radius = 5 + Math.min(count, 9) * 0.3;

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshStandardMaterial({
        color: nodeColor,
        roughness: 0.5,
        metalness: 0.05,
      }),
    );
    group.add(dot);

    const label = createTextSprite(`${node.label} (${count})`);
    label.position.z = radius + 7;
    group.add(label);

    return group;
  }

  const hash = Array.from(node.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const radius = 3.1 + (hash % 4) * 0.18;

  const fileDot = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshStandardMaterial({
      color: nodeColor,
      roughness: 0.52,
      metalness: 0.04,
    }),
  );
  group.add(fileDot);

  return group;
};

export const GraphView: React.FC<GraphViewProps> = ({ notes, onOpenNote }) => {
  const [activeType, setActiveType] = useState<TagType>('topic');
  const graphRef = useRef<any>(null);
  const graphData = useMemo(() => buildTreeGraph(notes, activeType), [activeType, notes]);
  const hasTagNodes = graphData.nodes.some((node) => node.type === 'tag');

  React.useEffect(() => {
    if (!hasTagNodes) return;

    window.setTimeout(() => {
      graphRef.current?.zoomToFit?.(650, 78);
    }, 350);
  }, [activeType, hasTagNodes, graphData.nodes.length]);

  return (
    <div id="graph-view" className="view-pane">
      <div className="graph-toolbar">
        <div>
          <p>3D 태그 트리</p>
          <h2>{tagMeta[activeType].label} 관계 나무</h2>
        </div>
        <div className="graph-type-toggle" role="group" aria-label="그래프 태그 타입 선택">
          {graphTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={activeType === type ? 'active' : ''}
              onClick={() => setActiveType(type)}
            >
              {tagMeta[type].marker} {tagMeta[type].label}
            </button>
          ))}
        </div>
      </div>

      <div className="graph-canvas">
        {hasTagNodes ? (
          <ForceGraph3D
            ref={graphRef}
            graphData={graphData}
            backgroundColor="#101010"
            nodeLabel={(node: GraphNode) => node.type === 'tag' && node.count
              ? `${node.label} (${node.count})`
              : node.label}
            nodeThreeObject={(node: GraphNode) => createNodeObject(node)}
            linkColor={() => 'rgba(226, 232, 240, 0.42)'}
            linkWidth={(link: GraphLink) => link.kind === 'root' ? 1.5 : 0.7}
            linkOpacity={0.62}
            cooldownTicks={180}
            d3AlphaDecay={0.018}
            d3VelocityDecay={0.32}
            warmupTicks={80}
            showNavInfo={false}
            onNodeClick={(node: GraphNode) => {
              if (node.type === 'file' && node.path) {
                onOpenNote(node.path);
              }
            }}
          />
        ) : (
          <div className="graph-empty">
            <strong>{tagMeta[activeType].label} 태그가 아직 없어요</strong>
            <span>노트 본문이나 태그 표에서 {tagMeta[activeType].marker} 태그를 추가하면 나무가 자랍니다.</span>
          </div>
        )}
      </div>
    </div>
  );
};
