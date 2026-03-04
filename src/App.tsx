import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line, Circle, Rect, Text, Group } from 'react-konva';
import { COMPONENT_DEFINITIONS } from './constants';
import { ComponentInstance, Wire, Point, ComponentType } from './types';
import { CircuitSolver } from './lib/solver';
import { 
  Zap, 
  Trash2, 
  Play, 
  Square, 
  RefreshCw, 
  Settings2, 
  Layers,
  Activity,
  Cpu,
  MousePointer2,
  Plus
} from 'lucide-react';
import { cn } from './lib/utils';
import { LineChart, Line as ReLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GRID_SIZE = 20;

const EXPERIMENT_TEMPLATES = [
  {
    id: 'ce-char',
    name: 'BJT CE Characteristics',
    description: 'Measure Input and Output characteristics of a Common Emitter NPN transistor.',
  },
  {
    id: 'voltage-divider',
    name: 'Voltage Divider Bias',
    description: 'Study the stability of voltage divider biasing for BJT.',
  }
];

export default function App() {
  const [components, setComponents] = useState<ComponentInstance[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [activePin, setActivePin] = useState<{ componentId: string; pinId: string } | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'schematic' | 'breadboard'>('schematic');

  const stageRef = useRef<any>(null);

  // Resize handling
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const updateSize = () => {
      setStageSize({
        width: window.innerWidth - 256 - 320,
        height: window.innerHeight - 56 - 256
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const addComponent = (type: ComponentType) => {
    const def = COMPONENT_DEFINITIONS[type];
    const newComp: ComponentInstance = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 100,
      y: 100,
      rotation: 0,
      properties: { ...def.defaultProps },
      pins: [...def.pins],
    };
    setComponents([...components, newComp]);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setComponents(components.filter(c => c.id !== selectedId));
    setWires(wires.filter(w => w.fromComponentId !== selectedId && w.toComponentId !== selectedId));
    setSelectedId(null);
  };

  const handleRunSimulation = () => {
    const solver = new CircuitSolver(components, wires);
    const result = solver.solveDC();
    setSimulationResults(result);
    setIsSimulating(true);
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setSimulationResults(null);
  };

  const exportLabReport = () => {
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const reportHtml = `
      <html>
        <head>
          <title>Lab Report - Virtual EEE Lab</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
            .section { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>Electronics Lab Report</h1>
          <div class="section">
            <h2>Circuit Configuration</h2>
            <p>Components: ${components.length}</p>
            <p>Connections: ${wires.length}</p>
            <table>
              <thead>
                <tr><th>Component</th><th>Type</th><th>Properties</th></tr>
              </thead>
              <tbody>
                ${components.map(c => `
                  <tr>
                    <td>${c.id}</td>
                    <td>${c.type}</td>
                    <td>${JSON.stringify(c.properties)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="section">
            <h2>Simulation Results (DC Analysis)</h2>
            ${simulationResults ? `
              <table>
                <thead>
                  <tr><th>Node (Component:Pin)</th><th>Voltage (V)</th></tr>
                </thead>
                <tbody>
                  ${Object.entries(simulationResults.nodes).map(([node, voltage]) => `
                    <tr><td>${node}</td><td>${(voltage as number).toFixed(4)}V</td></tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>No simulation data available.</p>'}
          </div>
          <div class="section">
            <h2>Observations</h2>
            <p>__________________________________________________________________</p>
            <p>__________________________________________________________________</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
  };

  const handlePinClick = (componentId: string, pinId: string) => {
    if (!activePin) {
      setActivePin({ componentId, pinId });
    } else {
      if (activePin.componentId === componentId && activePin.pinId === pinId) {
        setActivePin(null);
        return;
      }
      // Create wire
      const newWire: Wire = {
        id: Math.random().toString(36).substr(2, 9),
        fromComponentId: activePin.componentId,
        fromPinId: activePin.pinId,
        toComponentId: componentId,
        toPinId: pinId,
        color: '#3b82f6',
      };
      setWires([...wires, newWire]);
      setActivePin(null);
    }
  };

  const getPinPos = (comp: ComponentInstance, pinId: string) => {
    const pin = comp.pins.find(p => p.id === pinId);
    if (!pin) return { x: 0, y: 0 };
    
    // Simple rotation math (only 0, 90, 180, 270 for now)
    const rad = (comp.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const rx = pin.relativePos.x * cos - pin.relativePos.y * sin;
    const ry = pin.relativePos.x * sin + pin.relativePos.y * cos;
    
    return { x: comp.x + rx, y: comp.y + ry };
  };

  return (
    <div className="flex h-screen w-full bg-[#121212] text-white overflow-hidden font-sans">
      {/* Sidebar: Component Library */}
      <div className="w-64 border-r border-white/10 bg-[#1a1a1a] flex flex-col">
        <div className="p-4 border-bottom border-white/10 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-500" />
          <h1 className="font-bold text-sm tracking-tight uppercase opacity-80">Component Library</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-semibold">Experiments</h2>
            <div className="space-y-2">
              {EXPERIMENT_TEMPLATES.map(exp => (
                <button
                  key={exp.id}
                  className="w-full text-left p-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 transition-all"
                >
                  <p className="text-[10px] font-bold text-emerald-400 mb-1">{exp.name}</p>
                  <p className="text-[9px] opacity-40 leading-tight">{exp.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-semibold">Passive</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['RESISTOR', 'CAPACITOR', 'INDUCTOR'] as ComponentType[]).map(type => (
                <button
                  key={type}
                  onClick={() => addComponent(type)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-xs font-mono font-bold">{COMPONENT_DEFINITIONS[type].icon}</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-60">{COMPONENT_DEFINITIONS[type].label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-semibold">Active</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['DIODE', 'BJT_NPN', 'BJT_PNP'] as ComponentType[]).map(type => (
                <button
                  key={type}
                  onClick={() => addComponent(type)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-xs font-mono font-bold">{COMPONENT_DEFINITIONS[type].icon}</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-60">{COMPONENT_DEFINITIONS[type].label}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] uppercase tracking-widest text-white/40 mb-3 font-semibold">Sources & GND</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['DC_SOURCE', 'AC_SOURCE', 'GROUND'] as ComponentType[]).map(type => (
                <button
                  key={type}
                  onClick={() => addComponent(type)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-xs font-mono font-bold">{COMPONENT_DEFINITIONS[type].icon}</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-60">{COMPONENT_DEFINITIONS[type].label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col relative">
        {/* Toolbar */}
        <div className="h-14 border-b border-white/10 bg-[#1a1a1a]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('schematic')}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === 'schematic' ? "bg-white/10 text-emerald-400" : "hover:bg-white/5 opacity-50")}
              >
                <MousePointer2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('breadboard')}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === 'breadboard' ? "bg-white/10 text-emerald-400" : "hover:bg-white/5 opacity-50")}
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <button 
              onClick={deleteSelected}
              disabled={!selectedId}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 disabled:opacity-20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-white/10" />
            <button 
              onClick={exportLabReport}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg text-[10px] font-bold transition-all"
            >
              EXPORT REPORT
            </button>
          </div>

          <div className="flex items-center gap-3">
            {!isSimulating ? (
              <button 
                onClick={handleRunSimulation}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
              >
                <Play className="w-3 h-3 fill-current" />
                RUN SIMULATION
              </button>
            ) : (
              <button 
                onClick={handleStopSimulation}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-bold transition-all shadow-lg shadow-red-900/20"
              >
                <Square className="w-3 h-3 fill-current" />
                STOP
              </button>
            )}
            <button className="p-2 rounded-full bg-white/5 hover:bg-white/10">
              <RefreshCw className="w-4 h-4 opacity-60" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-[#0f0f0f] relative overflow-hidden cursor-crosshair">
          {/* Grid Background */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
            }} 
          />
          
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            ref={stageRef}
            onMouseMove={(e) => {
              const stage = e.target.getStage();
              const pos = stage.getPointerPosition();
              if (pos) setMousePos(pos);
            }}
            onClick={(e) => {
              if (e.target === stageRef.current) {
                setSelectedId(null);
                setActivePin(null);
              }
            }}
          >
            <Layer>
              {/* Breadboard Background */}
              {viewMode === 'breadboard' && (
                <Group>
                  <Rect
                    width={stageSize.width}
                    height={stageSize.height}
                    fill="#e5e7eb"
                  />
                  {/* Draw breadboard holes */}
                  {Array.from({ length: Math.floor(stageSize.width / 20) }).map((_, i) => (
                    Array.from({ length: Math.floor(stageSize.height / 20) }).map((_, j) => (
                      <Circle
                        key={`${i}-${j}`}
                        x={i * 20 + 10}
                        y={j * 20 + 10}
                        radius={2}
                        fill="#9ca3af"
                      />
                    ))
                  ))}
                </Group>
              )}
              {/* Wires */}
              {wires.map(wire => {
                const fromComp = components.find(c => c.id === wire.fromComponentId);
                const toComp = components.find(c => c.id === wire.toComponentId);
                if (!fromComp || !toComp) return null;
                const p1 = getPinPos(fromComp, wire.fromPinId);
                const p2 = getPinPos(toComp, wire.toPinId);
                return (
                  <Line
                    key={wire.id}
                    points={[p1.x, p1.y, p2.x, p2.y]}
                    stroke={wire.color}
                    strokeWidth={2}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              })}

              {/* Active Wire Preview */}
              {activePin && (
                <Line
                  points={[
                    getPinPos(components.find(c => c.id === activePin.componentId)!, activePin.pinId).x,
                    getPinPos(components.find(c => c.id === activePin.componentId)!, activePin.pinId).y,
                    mousePos.x,
                    mousePos.y
                  ]}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              )}

              {/* Components */}
              {components.map(comp => (
                <Group
                  key={comp.id}
                  x={comp.x}
                  y={comp.y}
                  rotation={comp.rotation}
                  draggable
                  onDragEnd={(e) => {
                    const newX = Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE;
                    const newY = Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE;
                    setComponents(components.map(c => c.id === comp.id ? { ...c, x: newX, y: newY } : c));
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    setSelectedId(comp.id);
                  }}
                >
                  {/* Component Body */}
                  <Rect
                    width={40}
                    height={40}
                    offsetX={20}
                    offsetY={20}
                    fill={selectedId === comp.id ? '#3b82f622' : '#ffffff05'}
                    stroke={selectedId === comp.id ? '#3b82f6' : '#ffffff22'}
                    strokeWidth={1}
                    cornerRadius={4}
                  />
                  <Text
                    text={COMPONENT_DEFINITIONS[comp.type].icon}
                    fontSize={12}
                    fontFamily="monospace"
                    fill="white"
                    opacity={0.5}
                    offsetX={5}
                    offsetY={5}
                  />

                  {/* Pins */}
                  {comp.pins.map(pin => (
                    <Circle
                      key={pin.id}
                      x={pin.relativePos.x}
                      y={pin.relativePos.y}
                      radius={4}
                      fill={activePin?.componentId === comp.id && activePin?.pinId === pin.id ? '#3b82f6' : '#ffffff44'}
                      stroke="white"
                      strokeWidth={1}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'crosshair';
                      }}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        handlePinClick(comp.id, pin.id);
                      }}
                    />
                  ))}

                  {/* Voltage Labels (Simulation) */}
                  {isSimulating && simulationResults && comp.pins.map(pin => {
                    const voltage = simulationResults.nodes[`${comp.id}:${pin.id}`];
                    if (voltage === undefined) return null;
                    return (
                      <Text
                        key={`v-${pin.id}`}
                        text={`${voltage.toFixed(2)}V`}
                        x={pin.relativePos.x}
                        y={pin.relativePos.y - 15}
                        fontSize={10}
                        fill="#10b981"
                        fontStyle="bold"
                        align="center"
                      />
                    );
                  })}
                </Group>
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Bottom Panel: Instruments */}
        <div className="h-64 border-t border-white/10 bg-[#1a1a1a] flex flex-col">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Virtual Oscilloscope</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] opacity-40">CH1: Input</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] opacity-40">CH2: Output</span>
              </div>
            </div>
          </div>
          <div className="flex-1 p-4">
            <div className="w-full h-full bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
              {isSimulating ? (
                 <div className="text-center">
                    <p className="text-xs opacity-40 mb-2">Real-time waveform analysis active</p>
                    <div className="flex gap-4 justify-center">
                       <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                          <p className="text-[10px] opacity-40 uppercase mb-1">Peak-to-Peak</p>
                          <p className="text-lg font-mono text-blue-400">5.00V</p>
                       </div>
                       <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                          <p className="text-[10px] opacity-40 uppercase mb-1">Frequency</p>
                          <p className="text-lg font-mono text-emerald-400">50.0Hz</p>
                       </div>
                    </div>
                 </div>
              ) : (
                <p className="text-xs opacity-20 italic">Run simulation to see waveforms</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Properties */}
      <div className="w-80 border-l border-white/10 bg-[#1a1a1a] flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-blue-500" />
          <h1 className="font-bold text-sm tracking-tight uppercase opacity-80">Properties</h1>
        </div>
        <div className="p-6">
          {selectedId ? (
            <div className="space-y-6">
              {components.filter(c => c.id === selectedId).map(comp => (
                <div key={comp.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{comp.type}</span>
                    <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded">ID: {comp.id}</span>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(comp.properties).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-xs opacity-60 capitalize">{key}</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value);
                              setComponents(components.map(c => 
                                c.id === comp.id 
                                  ? { ...c, properties: { ...c.properties, [key]: newVal } } 
                                  : c
                              ));
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 text-xs opacity-40 flex items-center">
                            {key === 'value' ? (comp.type === 'RESISTOR' ? 'Ω' : comp.type === 'CAPACITOR' ? 'F' : 'H') : 'V'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <label className="text-xs opacity-60 block mb-2">Rotation</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 90, 180, 270].map(deg => (
                        <button
                          key={deg}
                          onClick={() => setComponents(components.map(c => c.id === comp.id ? { ...c, rotation: deg } : c))}
                          className={cn(
                            "py-2 rounded-lg text-[10px] font-bold border transition-all",
                            comp.rotation === deg ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20 py-20">
              <Layers className="w-12 h-12" />
              <p className="text-xs italic">Select a component to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
