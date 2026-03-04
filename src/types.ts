export type ComponentType = 
  | 'RESISTOR' 
  | 'CAPACITOR' 
  | 'INDUCTOR' 
  | 'DIODE' 
  | 'BJT_NPN' 
  | 'BJT_PNP' 
  | 'DC_SOURCE' 
  | 'AC_SOURCE' 
  | 'GROUND';

export interface Point {
  x: number;
  y: number;
}

export interface Pin {
  id: string;
  label: string;
  relativePos: Point;
}

export interface ComponentInstance {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  rotation: number;
  properties: Record<string, number | string>;
  pins: Pin[];
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinId: string;
  toComponentId: string;
  toPinId: string;
  color: string;
}

export interface SimulationResult {
  nodes: Record<string, number>; // nodeName -> voltage
  currents: Record<string, number>; // componentId -> current
  time?: number;
}
