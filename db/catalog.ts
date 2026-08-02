/**
 * Vocabulario de catálogo para el seed.
 *
 * Los generadores genéricos de faker producen nombres tipo "Pantalones
 * Práctico de Acero", que no se parecen en nada al catálogo de una ferretería.
 * Definir el vocabulario por categoría hace que los datos ficticios se lean
 * como datos reales, que es justamente lo que se quiere mostrar en una demo.
 */

export type CatalogCategory = {
  name: string;
  description: string;
  /** Productos base de la categoría. */
  items: readonly string[];
  /** Variantes que se concatenan al nombre (medida, material, potencia…). */
  variants: readonly string[];
};

export const CATALOG: readonly CatalogCategory[] = [
  {
    name: "Herramientas manuales",
    description: "Llaves, destornilladores, alicates y martillos.",
    items: [
      "Martillo de carpintero",
      "Destornillador Phillips",
      "Destornillador plano",
      "Alicate universal",
      "Alicate de punta",
      "Llave ajustable",
      "Juego de llaves Allen",
      "Llave de tubo",
      "Serrucho de mano",
      "Cinta métrica",
      "Nivel de burbuja",
      "Escuadra metálica",
      "Cincel para concreto",
      "Prensa de banco",
    ],
    variants: ['6"', '8"', '10"', '12"', "cromo vanadio", "mango de goma", "acero forjado"],
  },
  {
    name: "Herramientas eléctricas",
    description: "Taladros, sierras, lijadoras y accesorios.",
    items: [
      "Taladro percutor",
      "Atornillador inalámbrico",
      "Sierra circular",
      "Sierra caladora",
      "Esmeril angular",
      "Lijadora orbital",
      "Rotomartillo",
      "Pistola de calor",
      "Compresor de aire",
      "Soldadora inverter",
    ],
    variants: ["500W", "750W", "1200W", "1800W", "12V", "18V", "20V Max", "sin escobillas"],
  },
  {
    name: "Ferretería general",
    description: "Tornillería, fijaciones y elementos de sujeción.",
    items: [
      "Caja de tornillos autoperforantes",
      "Caja de clavos de acero",
      "Tarugos plásticos",
      "Pernos de anclaje",
      "Tuercas hexagonales",
      "Golillas planas",
      "Bisagras de acero",
      "Candado de seguridad",
      "Abrazaderas metálicas",
      "Cadena galvanizada",
    ],
    variants: ["x100 unidades", "x250 unidades", "1/4\"", "3/8\"", "5/16\"", "galvanizado", "inoxidable"],
  },
  {
    name: "Pinturas y solventes",
    description: "Látex, esmaltes, barnices, diluyentes y rodillos.",
    items: [
      "Látex lavable interior",
      "Esmalte sintético",
      "Barniz marino",
      "Aguarrás mineral",
      "Diluyente universal",
      "Imprimante antióxido",
      "Rodillo antigota",
      "Brocha profesional",
      "Cinta de enmascarar",
      "Removedor de pintura",
    ],
    variants: ["1 L", "4 L", "galón", "blanco", "negro mate", '4"', "premium"],
  },
  {
    name: "Electricidad",
    description: "Cables, tableros, enchufes, llaves térmicas e iluminación.",
    items: [
      "Cable eléctrico unipolar",
      "Automático térmico",
      "Tablero de distribución",
      "Enchufe hembra doble",
      "Interruptor de pared",
      "Ampolleta LED",
      "Tubo LED",
      "Foco reflector LED",
      "Alargador eléctrico",
      "Canaleta plástica",
    ],
    variants: ["1.5 mm²", "2.5 mm²", "10A", "16A", "25A", "9W", "18W", "50W", "5 m"],
  },
  {
    name: "Gasfitería",
    description: "Cañerías, fittings, grifería y sellos.",
    items: [
      "Tubo PVC sanitario",
      "Codo PVC 90°",
      "Tee PVC",
      "Llave de paso",
      "Grifería de lavaplatos",
      "Flexible de conexión",
      "Sello de teflón",
      "Sifón para lavamanos",
      "Válvula de retención",
      "Kit de reparación de estanque",
    ],
    variants: ['1/2"', '3/4"', '1"', "2\"", "110 mm", "cromado", "reforzado"],
  },
  {
    name: "Jardín y exterior",
    description: "Riego, cortadoras de pasto y mobiliario de patio.",
    items: [
      "Manguera reforzada",
      "Aspersor giratorio",
      "Pistola de riego",
      "Cortadora de pasto",
      "Orilladora eléctrica",
      "Tijera de podar",
      "Pala punta de huevo",
      "Rastrillo metálico",
      "Carretilla reforzada",
      "Set de riego por goteo",
    ],
    variants: ["15 m", "25 m", "50 m", "1400W", "acero templado", "mango de madera", "80 L"],
  },
  {
    name: "Seguridad industrial",
    description: "Cascos, guantes, lentes y calzado de protección.",
    items: [
      "Casco de seguridad",
      "Guantes de cabritilla",
      "Guantes anticorte",
      "Lentes de seguridad",
      "Protector auditivo",
      "Mascarilla con filtro",
      "Zapato de seguridad",
      "Arnés de altura",
      "Chaleco reflectante",
      "Rodilleras de trabajo",
    ],
    variants: ["talla M", "talla L", "talla XL", "clase A", "certificado", "antiempañante"],
  },
];
