import { ComponentType, Pin } from './types';

export const COMPONENT_DEFINITIONS: Record<ComponentType, {
  label: string;
  icon: string;
  defaultProps: Record<string, any>;
  pins: Pin[];
}> = {
  RESISTOR: {
    label: 'Resistor',
    icon: 'R',
    defaultProps: { value: 1000 },
    pins: [
      { id: 'p1', label: '1', relativePos: { x: -20, y: 0 } },
      { id: 'p2', label: '2', relativePos: { x: 20, y: 0 } },
    ]
  },
  CAPACITOR: {
    label: 'Capacitor',
    icon: 'C',
    defaultProps: { value: 0.000001 },
    pins: [
      { id: 'p1', label: '1', relativePos: { x: -20, y: 0 } },
      { id: 'p2', label: '2', relativePos: { x: 20, y: 0 } },
    ]
  },
  INDUCTOR: {
    label: 'Inductor',
    icon: 'L',
    defaultProps: { value: 0.001 },
    pins: [
      { id: 'p1', label: '1', relativePos: { x: -20, y: 0 } },
      { id: 'p2', label: '2', relativePos: { x: 20, y: 0 } },
    ]
  },
  DIODE: {
    label: 'Diode',
    icon: 'D',
    defaultProps: { model: '1N4148' },
    pins: [
      { id: 'anode', label: 'A', relativePos: { x: -20, y: 0 } },
      { id: 'cathode', label: 'K', relativePos: { x: 20, y: 0 } },
    ]
  },
  BJT_NPN: {
    label: 'NPN BJT',
    icon: 'NPN',
    defaultProps: { beta: 100 },
    pins: [
      { id: 'collector', label: 'C', relativePos: { x: 10, y: -20 } },
      { id: 'base', label: 'B', relativePos: { x: -20, y: 0 } },
      { id: 'emitter', label: 'E', relativePos: { x: 10, y: 20 } },
    ]
  },
  BJT_PNP: {
    label: 'PNP BJT',
    icon: 'PNP',
    defaultProps: { beta: 100 },
    pins: [
      { id: 'collector', label: 'C', relativePos: { x: 10, y: 20 } },
      { id: 'base', label: 'B', relativePos: { x: -20, y: 0 } },
      { id: 'emitter', label: 'E', relativePos: { x: 10, y: -20 } },
    ]
  },
  DC_SOURCE: {
    label: 'DC Source',
    icon: 'V',
    defaultProps: { voltage: 5 },
    pins: [
      { id: 'pos', label: '+', relativePos: { x: 0, y: -20 } },
      { id: 'neg', label: '-', relativePos: { x: 0, y: 20 } },
    ]
  },
  AC_SOURCE: {
    label: 'AC Source',
    icon: 'VAC',
    defaultProps: { amplitude: 5, frequency: 50 },
    pins: [
      { id: 'pos', label: '+', relativePos: { x: 0, y: -20 } },
      { id: 'neg', label: '-', relativePos: { x: 0, y: 20 } },
    ]
  },
  GROUND: {
    label: 'Ground',
    icon: 'GND',
    defaultProps: {},
    pins: [
      { id: 'gnd', label: 'GND', relativePos: { x: 0, y: -10 } },
    ]
  }
};
