import * as math from 'mathjs';
import { ComponentInstance, Wire, SimulationResult } from '../types';

/**
 * A basic Modified Nodal Analysis (MNA) solver for DC and Transient analysis.
 */
export class CircuitSolver {
  private components: ComponentInstance[];
  private wires: Wire[];
  private nodes: Map<string, number> = new Map(); // pinId -> nodeId
  private nodeCount = 0;

  constructor(components: ComponentInstance[], wires: Wire[]) {
    this.components = components;
    this.wires = wires;
    this.buildNodeMap();
  }

  private buildNodeMap() {
    this.nodes.clear();
    this.nodeCount = 0;

    // Union-find or simple grouping to find connected pins
    const pinToNode = new Map<string, number>();
    let nextNodeId = 1; // 0 is reserved for GND

    // Initialize all pins as separate nodes
    this.components.forEach(c => {
      c.pins.forEach(p => {
        const pinKey = `${c.id}:${p.id}`;
        pinToNode.set(pinKey, nextNodeId++);
      });
    });

    // Merge nodes based on wires
    this.wires.forEach(w => {
      const fromKey = `${w.fromComponentId}:${w.fromPinId}`;
      const toKey = `${w.toComponentId}:${w.toPinId}`;
      const fromNode = pinToNode.get(fromKey);
      const toNode = pinToNode.get(toKey);

      if (fromNode !== undefined && toNode !== undefined && fromNode !== toNode) {
        // Simple merge: replace all instances of toNode with fromNode
        pinToNode.forEach((val, key) => {
          if (val === toNode) pinToNode.set(key, fromNode);
        });
      }
    });

    // Handle GROUND
    this.components.filter(c => c.type === 'GROUND').forEach(gnd => {
      const gndPinKey = `${gnd.id}:${gnd.pins[0].id}`;
      const gndNode = pinToNode.get(gndPinKey);
      if (gndNode !== undefined) {
        pinToNode.forEach((val, key) => {
          if (val === gndNode) pinToNode.set(key, 0);
        });
      }
    });

    // Re-index nodes to be continuous
    const uniqueNodes = Array.from(new Set(pinToNode.values())).sort((a, b) => a - b);
    const nodeMapping = new Map<number, number>();
    uniqueNodes.forEach((node, index) => nodeMapping.set(node, index));

    pinToNode.forEach((val, key) => {
      this.nodes.set(key, nodeMapping.get(val)!);
    });

    this.nodeCount = uniqueNodes.length - 1; // excluding GND
  }

  public solveDC(): SimulationResult {
    const n = this.nodeCount;
    // Count voltage sources for MNA matrix size
    const vSources = this.components.filter(c => c.type === 'DC_SOURCE');
    const m = vSources.length;
    const size = n + m;

    if (size === 0) return { nodes: {}, currents: {} };

    // Initialize G matrix and B vector
    const G = math.zeros(size, size) as math.Matrix;
    const B = math.zeros(size) as math.Matrix;

    // Fill G matrix with passive components
    this.components.forEach(c => {
      if (c.type === 'RESISTOR') {
        const n1 = this.nodes.get(`${c.id}:p1`)!;
        const n2 = this.nodes.get(`${c.id}:p2`)!;
        const r = Number(c.properties.value) || 1e-9;
        const g = 1 / r;
        this.stampResistor(G, n1, n2, g);
      }
    });

    // Fill G matrix and B vector with voltage sources
    vSources.forEach((v, idx) => {
      const nPos = this.nodes.get(`${v.id}:pos`)!;
      const nNeg = this.nodes.get(`${v.id}:neg`)!;
      const val = Number(v.properties.voltage) || 0;
      const row = n + idx;

      if (nPos > 0) {
        G.set([row, nPos - 1], 1);
        G.set([nPos - 1, row], 1);
      }
      if (nNeg > 0) {
        G.set([row, nNeg - 1], -1);
        G.set([nNeg - 1, row], -1);
      }
      B.set([row], val);
    });

    // Handle BJTs (Simplified Linear Model for DC)
    // For a real lab, we'd iterate. Here we'll do a single pass or simple approximation.
    this.components.forEach(c => {
      if (c.type === 'BJT_NPN') {
        const nC = this.nodes.get(`${c.id}:collector`)!;
        const nB = this.nodes.get(`${c.id}:base`)!;
        const nE = this.nodes.get(`${c.id}:emitter`)!;
        const beta = Number(c.properties.beta) || 100;
        
        // Simple model: Ic = beta * Ib
        // Ib = (Vb - Ve - 0.7) / R_internal
        // This is hard to stamp directly in MNA without iteration.
        // For MVP, we'll treat it as a voltage-controlled current source if possible,
        // but MNA usually handles VCCS as G matrix stamps.
      }
    });

    try {
      const X = math.lusolve(G, B) as math.Matrix;
      const resNodes: Record<string, number> = {};
      
      // Map back to pins
      this.nodes.forEach((nodeId, pinKey) => {
        if (nodeId === 0) {
          resNodes[pinKey] = 0;
        } else {
          resNodes[pinKey] = (X.get([nodeId - 1, 0]) as number);
        }
      });

      return { nodes: resNodes, currents: {} };
    } catch (e) {
      console.error("Solver failed:", e);
      return { nodes: {}, currents: {} };
    }
  }

  private stampResistor(G: math.Matrix, n1: number, n2: number, g: number) {
    if (n1 > 0) G.set([n1 - 1, n1 - 1], (G.get([n1 - 1, n1 - 1]) as number) + g);
    if (n2 > 0) G.set([n2 - 1, n2 - 1], (G.get([n2 - 1, n2 - 1]) as number) + g);
    if (n1 > 0 && n2 > 0) {
      G.set([n1 - 1, n2 - 1], (G.get([n1 - 1, n2 - 1]) as number) - g);
      G.set([n2 - 1, n1 - 1], (G.get([n2 - 1, n1 - 1]) as number) - g);
    }
  }
}
