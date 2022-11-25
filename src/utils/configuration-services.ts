
export interface ConfigurationServices {
  getConfig(name: string): Promise<number>;
  setConfig(name: string, value: number): Promise<void>;
}
