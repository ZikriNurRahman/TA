export interface Device {
  _id: string;
  name: string;
  type: "light" | "fan" | string; // Bisa diperluas nanti
  isOn: boolean;
}
