export type MockDestination = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const MOCK_DESTINATIONS: Record<string, MockDestination> = {
  dest_polo_petroquimico: {
    id: "dest_polo_petroquimico",
    name: "Polo Petroquimico",
    address: "Ruta Nacional 3 Km 701, Bahia Blanca",
    lat: -38.7857,
    lng: -62.2689,
  },
  dest_puerto_ingeniero_white: {
    id: "dest_puerto_ingeniero_white",
    name: "Puerto Ingeniero White",
    address: "Av. Dasso 4200, Ingeniero White",
    lat: -38.7818,
    lng: -62.2746,
  },
};

export function getMockDestinationById(destinationId: string) {
  return MOCK_DESTINATIONS[destinationId] ?? null;
}
