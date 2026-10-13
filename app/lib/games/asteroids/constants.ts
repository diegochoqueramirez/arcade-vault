// Resolución lógica del canvas (px). El escalado visual lo hace CSS.
export const W = 800;
export const H = 600;
// Por tamaño de asteroide: índice 1 = pequeño, 2 = mediano, 3 = grande.
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const; // velocidad base (px/s)
export const POINTS = [0, 100, 50, 20] as const;
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5; // s de triple disparo
export const POWERUP_TTL = 12; // s antes de desaparecer
export const TRIPLE_SPREAD = 0.18; // rad
