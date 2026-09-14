"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Share2, ZoomIn, ZoomOut, RotateCcw, Volume2, Search,
  Filter, Sparkles, X, Info, Layers, BookOpen, ExternalLink
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface GraphNode {
  id: string;
  label: string;
  pos: string;
  level: string;
  phonetic?: string;
  meaning_vn?: string;
  meaning_en?: string;
  example?: string;
  audio_url?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation: string;
  type?: string;
  color?: string;
}

interface KnowledgeGraphProps {
  API_URL?: string;
  centerWord?: string;
  targetWord?: string;
  connections?: any[];
  activeLookupResult?: any;
  onWordClick?: (word: string) => void;
}

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  A1: { bg: "#ecfdf5", border: "#10b981", text: "#065f46", dot: "#10b981" },
  A2: { bg: "#f0fdfa", border: "#14b8a6", text: "#115e59", dot: "#14b8a6" },
  B1: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", dot: "#3b82f6" },
  B2: { bg: "#eef2ff", border: "#6366f1", text: "#3730a3", dot: "#6366f1" },
  C1: { bg: "#faf5ff", border: "#a855f7", text: "#6b21a8", dot: "#a855f7" },
  C2: { bg: "#fdf2f8", border: "#ec4899", text: "#9d174d", dot: "#ec4899" },
};

export default function KnowledgeGraph({
  API_URL,
  centerWord,
  targetWord,
  connections,
  activeLookupResult,
  onWordClick
}: KnowledgeGraphProps) {
  const { authFetch } = useAuth();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [relationFilter, setRelationFilter] = useState("ALL");
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 850;
  const height = 550;
  const centerX = width / 2;
  const centerY = height / 2;

  // Integrate actively searched word + its synonyms and antonyms into graph
  const integrateLookupData = (baseNodes: GraphNode[], baseLinks: GraphLink[]): { nodes: GraphNode[]; links: GraphLink[] } => {
    if (!activeLookupResult || !activeLookupResult.word) return { nodes: baseNodes, links: baseLinks };

    const wKey = activeLookupResult.word.trim().toLowerCase();
    const nodeMap = new Map<string, GraphNode>(baseNodes.map(n => [n.id, n]));
    const linkSet = new Set<string>(baseLinks.map(l => [l.source, l.target].sort().join("<->")));
    const mergedNodes = [...baseNodes];
    const mergedLinks = [...baseLinks];

    // 1. Ensure target word is a node
    if (!nodeMap.has(wKey)) {
      const firstM = (activeLookupResult.meanings || [{}])[0];
      const targetNode: GraphNode = {
        id: wKey,
        label: activeLookupResult.word,
        pos: activeLookupResult.pos || firstM.pos || "noun",
        level: activeLookupResult.level || "B1",
        phonetic: activeLookupResult.phonetic_uk || activeLookupResult.phonetic_us || "",
        meaning_vn: firstM.definition_vn || "",
        meaning_en: firstM.definition_en || "",
        example: (firstM.examples || [""])[0],
        audio_url: activeLookupResult.audio_url || activeLookupResult.audio_url_uk || "",
        x: centerX,
        y: centerY,
      };
      mergedNodes.push(targetNode);
      nodeMap.set(wKey, targetNode);
    } else {
      const existing = nodeMap.get(wKey)!;
      if (activeLookupResult.meanings?.length > 0) {
        const firstM = activeLookupResult.meanings[0];
        if (!existing.meaning_vn && firstM.definition_vn) existing.meaning_vn = firstM.definition_vn;
        if (!existing.meaning_en && firstM.definition_en) existing.meaning_en = firstM.definition_en;
      }
    }

    const parentNode = nodeMap.get(wKey);
    const px = parentNode?.x ?? centerX;
    const py = parentNode?.y ?? centerY;

    let satelliteIdx = 0;
    // Helper to add connected satellite node with radial distribution
    const addSatellite = (wordStr: string, relLabel: string, relType: string, relColor: string, meaningVn: string = "") => {
      const satKey = wordStr.trim().toLowerCase();
      if (!satKey || satKey === wKey || satKey.length > 25 || satKey.includes(" ")) return;

      if (!nodeMap.has(satKey)) {
        const angle = (satelliteIdx / 10) * 2 * Math.PI + 0.15;
        const dist = 100 + (satelliteIdx % 3) * 30;
        satelliteIdx++;

        const satNode: GraphNode = {
          id: satKey,
          label: satKey,
          pos: relType,
          level: parentNode?.level || "B1",
          meaning_vn: meaningVn || `${relLabel} của "${wKey}"`,
          x: Math.max(50, Math.min(width - 50, px + dist * Math.cos(angle))),
          y: Math.max(50, Math.min(height - 50, py + dist * Math.sin(angle))),
        };
        mergedNodes.push(satNode);
        nodeMap.set(satKey, satNode);
      }

      const pairKey = [wKey, satKey].sort().join("<->");
      if (!linkSet.has(pairKey)) {
        linkSet.add(pairKey);
        mergedLinks.push({
          source: wKey,
          target: satKey,
          relation: relLabel,
          type: relType,
          color: relColor,
        });
      }
    };

    // Add synonyms
    const syns = new Set<string>();
    activeLookupResult.meanings?.forEach((m: any) => {
      if (Array.isArray(m.synonyms)) {
        m.synonyms.forEach((s: string) => {
          if (typeof s === "string" && s.trim()) syns.add(s.trim());
        });
      }
    });
    Array.from(syns).slice(0, 6).forEach(s => addSatellite(s, "Đồng nghĩa (Synonym)", "synonym", "#10b981", `Từ đồng nghĩa với "${wKey}"`));

    // Add antonyms
    const ants = new Set<string>();
    activeLookupResult.meanings?.forEach((m: any) => {
      if (Array.isArray(m.antonyms)) {
        m.antonyms.forEach((a: string) => {
          if (typeof a === "string" && a.trim()) ants.add(a.trim());
        });
      }
    });
    Array.from(ants).slice(0, 5).forEach(a => addSatellite(a, "Trái nghĩa (Antonym)", "antonym", "#ef4444", `Từ trái nghĩa với "${wKey}"`));

    // Add word family
    if (Array.isArray(activeLookupResult.word_family)) {
      activeLookupResult.word_family.slice(0, 4).forEach((f: string) => {
        if (typeof f === "string" && f.trim()) {
          addSatellite(f.trim(), "Cùng họ từ (Family)", "word_family", "#8b5cf6", `Cùng họ từ với "${wKey}"`);
        }
      });
    }

    return { nodes: mergedNodes, links: mergedLinks };
  };

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL || ""}/student/vocabulary/knowledge-graph`);
      if (res.ok) {
        const json = await res.json();
        const rawNodes: GraphNode[] = json.nodes || [];
        const rawLinks: GraphLink[] = json.links || [];

        // Initial circular cluster layout
        const total = rawNodes.length;
        const radius = Math.min(width, height) * 0.38;
        const positionedNodes = rawNodes.map((node, i) => {
          const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
          const jitter = (Math.sin(i * 3.7) * 20);
          return {
            ...node,
            x: centerX + (radius + jitter) * Math.cos(angle),
            y: centerY + (radius + jitter) * Math.sin(angle),
          };
        });

        // Merge actively looked-up word and its relations
        const merged = integrateLookupData(positionedNodes, rawLinks);
        setNodes(merged.nodes);
        setLinks(merged.links);

        // If targetWord or activeLookupResult is specified, auto-focus & center immediately
        const focusWord = targetWord || activeLookupResult?.word;
        if (focusWord) {
          const clean = focusWord.trim().toLowerCase();
          const found = merged.nodes.find(n => n.id === clean || n.label.toLowerCase() === clean);
          if (found) {
            setSelectedNode(found);
            if (found.x !== undefined && found.y !== undefined) {
              setPan({
                x: centerX - found.x * zoom,
                y: centerY - found.y * zoom,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching knowledge graph:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connections && connections.length > 0 && centerWord) {
      setLoading(true);
      const rootNode: GraphNode = {
        id: centerWord.toLowerCase(),
        label: centerWord,
        pos: "focus",
        level: "B1",
        x: centerX,
        y: centerY,
      };
      const childNodes: GraphNode[] = [];
      const childLinks: GraphLink[] = [];
      const total = connections.length;
      const radius = Math.min(width, height) * 0.34;

      connections.forEach((conn: any, i: number) => {
        const wordName = typeof conn === "string" ? conn : (conn.word || conn.target || "");
        if (!wordName) return;
        const rel = typeof conn === "object" ? (conn.relation || "RELATED") : "RELATED";
        const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
        const nodeId = wordName.toLowerCase();
        childNodes.push({
          id: nodeId,
          label: wordName,
          pos: rel.toLowerCase(),
          level: "B1",
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
        childLinks.push({
          source: rootNode.id,
          target: nodeId,
          relation: rel,
          type: rel.toLowerCase().includes("synonym") ? "synonym" : rel.toLowerCase().includes("antonym") ? "antonym" : "topic",
        });
      });

      setNodes([rootNode, ...childNodes]);
      setLinks(childLinks);
      setLoading(false);
      return;
    }

    if (API_URL) {
      fetchGraphData();
    } else {
      setLoading(false);
    }
  }, [centerWord, connections, API_URL, activeLookupResult?.word, targetWord]);

  // Auto-focus and center canvas when targetWord or activeLookupResult updates
  useEffect(() => {
    const focusWord = targetWord || centerWord || (activeLookupResult?.word ? activeLookupResult.word : null);
    if (!focusWord || nodes.length === 0) return;

    const clean = focusWord.trim().toLowerCase();
    const found = nodes.find(n => n.id === clean || n.label.toLowerCase() === clean);
    if (found) {
      setSelectedNode(found);
      if (found.x !== undefined && found.y !== undefined) {
        setPan({
          x: centerX - found.x * zoom,
          y: centerY - found.y * zoom,
        });
      }
    }
  }, [targetWord, centerWord, activeLookupResult?.word, nodes.length, zoom]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === "rect") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const playAudio = (word: string, url?: string) => {
    if (url) {
      new Audio(url).play().catch(() => {});
    } else {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.speak(u);
    }
  };

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchSearch = !searchFilter || n.label.toLowerCase().includes(searchFilter.toLowerCase()) || (n.meaning_vn || "").toLowerCase().includes(searchFilter.toLowerCase());
      const matchLevel = levelFilter === "ALL" || n.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [nodes, searchFilter, levelFilter]);

  const activeNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredLinks = useMemo(() => {
    return links.filter((l) => {
      if (relationFilter !== "ALL" && l.type !== relationFilter) return false;
      return true;
    });
  }, [links, relationFilter]);

  // Set of neighbor nodes connected to selectedNode with their relationship info
  const connectedInfo = useMemo(() => {
    if (!selectedNode) return { nodeIds: new Set<string>(), relMap: new Map<string, { label: string; color: string; type: string }>() };
    const nodeIds = new Set<string>([selectedNode.id]);
    const relMap = new Map<string, { label: string; color: string; type: string }>();

    filteredLinks.forEach((link) => {
      if (link.source === selectedNode.id) {
        nodeIds.add(link.target);
        relMap.set(link.target, { label: link.relation, color: link.color || "#3b82f6", type: link.type });
      } else if (link.target === selectedNode.id) {
        nodeIds.add(link.source);
        relMap.set(link.source, { label: link.relation, color: link.color || "#3b82f6", type: link.type });
      }
    });
    return { nodeIds, relMap };
  }, [selectedNode, filteredLinks]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/85 shadow-sm overflow-hidden flex flex-col">
      {/* Control Bar */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm md:text-base flex items-center gap-2">
              Bản đồ Tri thức Từ vựng (Knowledge Graph)
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                {nodes.length} từ · {filteredLinks.length} liên kết
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Mạng lưới liên kết ngữ nghĩa: Đồng nghĩa, Trái nghĩa, Họ từ, Chủ đề & CEFR
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-40 md:w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Lọc từ vựng..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none text-gray-700 font-medium"
          >
            <option value="ALL">Mọi trình độ</option>
            <option value="A1">CEFR A1</option>
            <option value="A2">CEFR A2</option>
            <option value="B1">CEFR B1</option>
            <option value="B2">CEFR B2</option>
            <option value="C1">CEFR C1</option>
          </select>

          <select
            value={relationFilter}
            onChange={(e) => setRelationFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none text-gray-700 font-medium"
          >
            <option value="ALL">Mọi quan hệ</option>
            <option value="synonym">🟢 Đồng nghĩa (Synonym)</option>
            <option value="antonym">🔴 Trái nghĩa (Antonym)</option>
            <option value="word_family">🟣 Cùng họ từ (Family)</option>
            <option value="topic">🔵 Cùng chủ đề (Topic)</option>
            <option value="level">⚪ Cùng trình độ (CEFR)</option>
          </select>

          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
              title="Phóng to"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
              title="Thu nhỏ"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
              title="Đặt lại góc nhìn"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[540px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-inner">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-xs text-slate-600 font-medium">Đang kết nối đồ thị tri thức...</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-full"
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Center Hub Indicator */}
              <circle cx={centerX} cy={centerY} r="6" fill="#3b82f6" opacity="0.3" />
              <circle cx={centerX} cy={centerY} r="18" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />

              {/* Connecting Lines */}
              {filteredLinks.map((link, idx) => {
                const s = nodeMap.get(link.source);
                const t = nodeMap.get(link.target);
                if (!s || !t) return null;

                const isHighlighted = (selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id)) || (hoveredLink === link);
                const isFaded = (selectedNode && !isHighlighted) || (hoveredLink && hoveredLink !== link);
                const isFiltered = activeNodeIds.has(s.id) && activeNodeIds.has(t.id);
                const lineColor = link.color || (isHighlighted ? "#2563eb" : isFiltered ? "#94a3b8" : "#cbd5e1");

                const midX = ((s.x ?? 0) + (t.x ?? 0)) / 2;
                const midY = ((s.y ?? 0) + (t.y ?? 0)) / 2;

                return (
                  <g key={idx} onMouseEnter={() => setHoveredLink(link)} onMouseLeave={() => setHoveredLink(null)}>
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={isHighlighted ? "#2563eb" : lineColor}
                      strokeWidth={isHighlighted ? 2.5 : link.type === "synonym" || link.type === "antonym" || link.type === "word_family" ? 2 : 1.2}
                      strokeDasharray={link.type === "pos" ? "4 3" : undefined}
                      opacity={isFaded ? 0.15 : isHighlighted ? 1 : 0.75}
                      className="transition-all duration-200 cursor-pointer"
                    />
                    {isHighlighted && (
                      <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                        <rect
                          x="-45"
                          y="-10"
                          width="90"
                          height="20"
                          rx="6"
                          fill="#ffffff"
                          stroke={isHighlighted ? "#2563eb" : lineColor}
                          strokeWidth="1.5"
                          className="shadow-sm"
                        />
                        <text
                          y="4"
                          textAnchor="middle"
                          fill="#0f172a"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {link.relation.split(" (")[0]}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Graph Nodes */}
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isConnected = connectedInfo.nodeIds.has(node.id);
                const connRel = connectedInfo.relMap.get(node.id);
                const isMatching = activeNodeIds.has(node.id);
                const levelStyle = LEVEL_COLORS[node.level] || LEVEL_COLORS["B1"];
                
                // Keep selected node AND its connected relation nodes fully visible, dim unrelated nodes
                const isFaded = (!isMatching && (searchFilter || levelFilter !== "ALL")) || (selectedNode && !isConnected);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer transition-all duration-200"
                    opacity={isFaded ? 0.2 : 1}
                  >
                    {/* Outer Glow on Selected */}
                    {isSelected && (
                      <circle r="30" fill="#3b82f6" opacity="0.25" className="animate-pulse" />
                    )}

                    {/* Outer Accent Ring for Connected Related Words */}
                    {connRel && !isSelected && (
                      <circle r="23" fill={connRel.color} opacity="0.18" />
                    )}

                    {/* Node Circle */}
                    <circle
                      r={isSelected ? "22" : connRel ? "17" : "15"}
                      fill="#ffffff"
                      stroke={isSelected ? "#2563eb" : connRel ? connRel.color : levelStyle.border}
                      strokeWidth={isSelected ? "3.5" : connRel ? "2.5" : "2"}
                      className="hover:scale-125 transition-transform origin-center shadow-sm"
                    />

                    {/* Inner color dot */}
                    <circle r={isSelected ? "5" : "4"} fill={connRel ? connRel.color : levelStyle.dot} />

                    {/* Node Text Label */}
                    <text
                      y={isSelected ? "34" : "28"}
                      textAnchor="middle"
                      fill={isSelected ? "#1d4ed8" : connRel ? "#0f172a" : "#0f172a"}
                      fontSize={isSelected ? "13" : "11"}
                      fontWeight={isSelected ? "bold" : connRel ? "bold" : "600"}
                      className="pointer-events-none select-none"
                    >
                      {node.label}
                    </text>

                    {/* Relation Tag for Connected Words */}
                    {connRel && !isSelected ? (
                      <g transform="translate(0, 39)" className="pointer-events-none select-none">
                        <rect x="-35" y="-6" width="70" height="13" rx="3.5" fill={connRel.color} opacity="0.9" />
                        <text y="3.5" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                          {connRel.type === "synonym" ? "Đồng nghĩa" : connRel.type === "antonym" ? "Trái nghĩa" : connRel.type === "word_family" ? "Họ từ" : "Liên quan"}
                        </text>
                      </g>
                    ) : (
                      /* POS / Level Badge */
                      <text
                        y={isSelected ? "46" : "40"}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="500"
                        className="pointer-events-none select-none"
                      >
                        {node.level} · {node.pos.slice(0, 4)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-2 shadow-md max-w-sm">
          <div>
            <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider mb-1">Cấp độ CEFR</span>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(LEVEL_COLORS).map(([lvl, color]) => (
                <div key={lvl} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.dot }} />
                  <span className="font-medium text-slate-800">{lvl}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-1.5 border-t border-slate-200">
            <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider mb-1">Loại Mối Quan Hệ</span>
            <div className="flex items-center gap-2.5 flex-wrap text-[10px]">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-medium text-slate-800">Đồng nghĩa</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /><span className="font-medium text-slate-800">Trái nghĩa</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /><span className="font-medium text-slate-800">Họ từ</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="font-medium text-slate-800">Chủ đề</span></div>
            </div>
          </div>
        </div>

        {/* Selected Word Detail Card Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-2xl p-5 shadow-xl animate-in slide-in-from-right-4 duration-200 z-20">
            <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                    {selectedNode.label}
                  </h4>
                  <button
                    onClick={() => playAudio(selectedNode.label, selectedNode.audio_url)}
                    className="p-1 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                {selectedNode.phonetic && (
                  <p className="text-xs text-blue-600 font-mono mt-0.5">{selectedNode.phonetic}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                  {selectedNode.level}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700 uppercase">
                  {selectedNode.pos}
                </span>
              </div>

              {selectedNode.meaning_vn && (
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block">Nghĩa tiếng Việt:</span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedNode.meaning_vn}
                  </p>
                </div>
              )}

              {selectedNode.meaning_en && (
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block">Định nghĩa tiếng Anh:</span>
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                    "{selectedNode.meaning_en}"
                  </p>
                </div>
              )}

              {selectedNode.example && (
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 block">Ví dụ minh họa:</span>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                    {selectedNode.example}
                  </p>
                </div>
              )}

              {/* Connected Words in Graph */}
              {(() => {
                const nodeLinks = links.filter(l => l.source === selectedNode.id || l.target === selectedNode.id);
                if (nodeLinks.length === 0) return null;
                return (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                      Từ vựng liên kết ({nodeLinks.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {nodeLinks.map((nl, i) => {
                        const otherId = nl.source === selectedNode.id ? nl.target : nl.source;
                        const otherNode = nodes.find(n => n.id === otherId);
                        return (
                          <button
                            key={i}
                            onClick={() => otherNode && setSelectedNode(otherNode)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 transition"
                            title={nl.relation}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nl.color || "#6366f1" }} />
                            <span>{otherId}</span>
                            <span className="text-[9px] text-gray-400">({nl.relation.split(" (")[0]})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {onWordClick && (
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => onWordClick(selectedNode.label)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Search size={13} />
                    <span>Tra cứu chi tiết từ "{selectedNode.label}"</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
