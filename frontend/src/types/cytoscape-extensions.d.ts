import { Core, EventObject } from 'cytoscape';

declare module 'cytoscape' {
  interface Core {
    use(extension: any): void;
    batch(fn: () => void): void;
    on(events: string, selector: string, handler: (event: EventObject) => void): this;
    on(events: string, handler: (event: EventObject) => void): this;
    off(events: string, selector: string, handler: (event: EventObject) => void): this;
    off(events: string, handler: (event: EventObject) => void): this;
  }
}
