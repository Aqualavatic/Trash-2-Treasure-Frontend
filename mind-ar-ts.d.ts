declare module "mind-ar-ts/dist/mindar-image-three.prod.js" {
  export class MindARThree {
    constructor(config: any);
    start(): Promise<void>;
    stop(): void;
    addAnchor(index: number): any;
    renderer: any;
    scene: any;
    camera: any;
  }
  export const THREE: any;
  const defaultExport: {
    MindARThree: typeof MindARThree;
    THREE?: any;
  };
  export default defaultExport;
}