export interface Device {
  id: number;
  name: string;
  type: "light" | "fan" | string; // Bisa diperluas nanti
  isOn: boolean;
}
