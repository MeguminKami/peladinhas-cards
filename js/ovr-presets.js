import { ATTRIBUTES, OVR_POSITIONS, normalizeOvrWeights } from "./utils.js";
const weights = (values) =>
  Object.fromEntries(ATTRIBUTES.map(([key], i) => [key, values[i]]));
const neutral = (values) => {
  const w = weights(values);
  return {
    positions: Object.fromEntries(OVR_POSITIONS.map((p) => [p, { ...w }])),
  };
};
export function defaultOvrPresets(current) {
  return [
    {
      id: "position",
      name: "Com posição",
      settings: normalizeOvrWeights(current),
    },
    {
      id: "five",
      name: "5 Grandes",
      settings: neutral([12.4, 12.4, 12.4, 12.4, 12.4, 5, 8, 5, 5, 5, 5, 5]),
    },
    {
      id: "all",
      name: "Um pouco de tudo",
      settings: neutral([
        8.34, 8.34, 8.34, 8.34, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33,
      ]),
    },
    {
      id: "four",
      name: "4 Grandes",
      settings: neutral([5, 18, 18, 18, 18, 5, 3, 3, 3, 3, 3, 3]),
    },
    {
      id: "team",
      name: "Futebol coletivo",
      settings: neutral([5, 8, 16, 8, 8, 5, 5, 8, 12, 8, 12, 5]),
    },
    {
      id: "athletic",
      name: "Motor físico",
      settings: neutral([18, 8, 8, 8, 8, 16, 4, 16, 3, 3, 4, 4]),
    },
  ];
}
