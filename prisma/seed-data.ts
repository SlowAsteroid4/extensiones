// Dataset del seed T3 — determinista e importable, para que el unit test de
// integridad cuente sobre la misma fuente que se inserta en la base.
// Dinero en CENTAVOS de MXN. Ids fijos → upserts idempotentes.
import { FAMILIAS_TONO, LARGOS_DISPONIBLES } from "../src/shared/validacion/familias";

export interface CategoriaSeed {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
}

export interface VarianteSeed {
  id: string;
  largo_cm: number;
  precio_mxn: number;
  existencias: number;
  sku: string;
}

export interface ProductoSeed {
  id: string;
  nombre_tono: string;
  familia_tono: string;
  tipo: string;
  descripcion: string;
  fotos: string[];
  categoria_id: string;
  activo: boolean;
  variantes: VarianteSeed[];
}

export interface TestimonioSeed {
  id: string;
  nombre: string;
  texto: string;
  orden: number;
  activo: boolean;
}

export const CATEGORIAS_SEED: CategoriaSeed[] = [
  { id: "cat_clip", nombre: "Extensiones de clip", slug: "extensiones-de-clip", orden: 1 },
  { id: "cat_keratina", nombre: "Extensiones de keratina", slug: "extensiones-de-keratina", orden: 2 },
  { id: "cat_cola", nombre: "Colas de caballo", slug: "colas-de-caballo", orden: 3 },
];

const TIPO_POR_CATEGORIA: Record<string, string> = {
  cat_clip: "clip",
  cat_keratina: "keratina",
  cat_cola: "cola",
};

// Nombres realistas de tono por familia — 15+15+14+14+14 = 72 productos (≥70).
const NOMBRES_POR_FAMILIA: Record<(typeof FAMILIAS_TONO)[number], string[]> = {
  rubios: [
    "Rubio Platino Ártico",
    "Rubio Perla",
    "Rubio Cenizo Claro",
    "Rubio Dorado Miel",
    "Rubio Arena",
    "Rubio Beige Nórdico",
    "Rubio Champán",
    "Rubio Trigo",
    "Rubio Mantequilla",
    "Rubio Veneciano",
    "Rubio Dorado Sol",
    "Rubio Hielo",
    "Rubio Caramelo Claro",
    "Rubio Vainilla",
    "Rubio Oscuro Ceniza",
  ],
  castaños: [
    "Castaño Chocolate",
    "Castaño Avellana",
    "Castaño Caoba",
    "Castaño Café Moka",
    "Castaño Canela",
    "Castaño Nuez",
    "Castaño Almendra",
    "Castaño Espresso Oscuro",
    "Castaño Claro Dorado",
    "Castaño Ceniza Medio",
    "Castaño Bronce",
    "Castaño Miel Tostada",
    "Castaño Cacao Intenso",
    "Castaño Castor",
    "Castaño Cobrizo Suave",
  ],
  negros: [
    "Negro Azabache",
    "Negro Ónix",
    "Negro Natural 1B",
    "Negro Azulado",
    "Negro Carbón",
    "Negro Intenso",
    "Negro Café Oscuro",
    "Negro Grafito",
    "Negro Medianoche",
    "Negro Ébano",
    "Negro Obsidiana",
    "Negro Humo",
    "Negro Terciopelo",
    "Negro Clásico",
  ],
  rojizos: [
    "Rojo Cobrizo",
    "Rojo Caoba Intenso",
    "Rojo Cereza Oscura",
    "Rojo Borgoña",
    "Rojo Vino Tinto",
    "Cobre Natural",
    "Cobre Dorado",
    "Rojo Fuego",
    "Rojo Granate",
    "Rojo Rubí",
    "Rojo Terracota",
    "Rojo Canela Cobriza",
    "Rojo Chocolate Rojizo",
    "Rojo Ámbar",
  ],
  mechas: [
    "Mechas Balayage Miel",
    "Mechas Babylights Rubias",
    "Mechas Californianas",
    "Mechas Caramelo",
    "Mechas Platinadas",
    "Mechas Cenizas",
    "Mechas Doradas",
    "Mechas Cobrizas",
    "Mechas Chocolate y Miel",
    "Mechas Ombré Natural",
    "Mechas Fresa Dorada",
    "Mechas Trigo y Arena",
    "Mechas Bronde",
    "Mechas Avellana Iluminada",
  ],
};

const CODIGO_FAMILIA: Record<(typeof FAMILIAS_TONO)[number], string> = {
  rubios: "RUB",
  castaños: "CAS",
  negros: "NEG",
  rojizos: "ROJ",
  mechas: "MEC",
};

// Precio muestra entre $1,990 y $3,490 MXN (en centavos: 199000–349000),
// determinista a partir de los índices.
function precioMuestra(iGlobal: number, kVariante: number): number {
  const escalones = (iGlobal * 7 + kVariante * 3) % 16; // 0..15
  return (1990 + escalones * 100) * 100; // 199000..349000 centavos
}

// Existencias 0–15, determinista; (i*3 + k*5) % 16 garantiza varios ceros
// (p. ej. i=0/k=0, i=2/k=2, i=7/k=1, ...) para probar "agotado".
function existenciasMuestra(iGlobal: number, kVariante: number): number {
  return (iGlobal * 3 + kVariante * 5) % 16;
}

function construirProductos(): ProductoSeed[] {
  const productos: ProductoSeed[] = [];
  let iGlobal = 0;

  for (const familia of FAMILIAS_TONO) {
    const nombres = NOMBRES_POR_FAMILIA[familia];
    const codigo = CODIGO_FAMILIA[familia];

    nombres.forEach((nombre_tono, iFamilia) => {
      const numero = String(iFamilia + 1).padStart(3, "0");
      const id = `prod_${codigo.toLowerCase()}_${numero}`;
      const categoria = CATEGORIAS_SEED[iGlobal % CATEGORIAS_SEED.length];

      // 3 variantes por producto tomadas de {18, 20, 22, 24}: se omite una
      // rotando por índice para cubrir las cuatro combinaciones.
      const largos = LARGOS_DISPONIBLES.filter((_, idx) => idx !== iGlobal % 4);

      const variantes: VarianteSeed[] = largos.map((largo, k) => ({
        id: `var_${codigo.toLowerCase()}_${numero}_${largo}`,
        largo_cm: largo,
        precio_mxn: precioMuestra(iGlobal, k),
        existencias: existenciasMuestra(iGlobal, k),
        sku: `EXT-${codigo}-${numero}-${largo}`,
      }));

      productos.push({
        id,
        nombre_tono,
        familia_tono: familia,
        tipo: TIPO_POR_CATEGORIA[categoria.id],
        // Texto plano — sin HTML libre en descripciones (spec §7).
        descripcion: `Extensión de cabello 100% natural en tono ${nombre_tono.toLowerCase()}, familia ${familia}. Cabello remy suave y manejable, listo para peinar con calor.`,
        fotos: [`/img/productos/${id}_1.jpg`, `/img/productos/${id}_2.jpg`],
        categoria_id: categoria.id,
        activo: true,
        variantes,
      });

      iGlobal += 1;
    });
  }

  return productos;
}

export const PRODUCTOS_SEED: ProductoSeed[] = construirProductos();

export const TESTIMONIOS_SEED: TestimonioSeed[] = [
  {
    id: "testi_001",
    nombre: "Mariana G.",
    texto: "Las extensiones se sienten súper naturales, nadie nota que las traigo. El tono quedó idéntico a mi cabello.",
    orden: 1,
    activo: true,
  },
  {
    id: "testi_002",
    nombre: "Fernanda R.",
    texto: "Me asesoraron por WhatsApp para elegir el tono y le atinaron a la primera. Llegaron rapidísimo.",
    orden: 2,
    activo: true,
  },
  {
    id: "testi_003",
    nombre: "Alejandra M.",
    texto: "Ya es mi segunda compra. La calidad del cabello es otra cosa: se puede planchar y ondular sin problema.",
    orden: 3,
    activo: true,
  },
  {
    id: "testi_004",
    nombre: "Paola S.",
    texto: "Las uso para eventos y sesiones de fotos. El largo de 22 es perfecto y el color no se desvanece.",
    orden: 4,
    activo: true,
  },
  {
    id: "testi_005",
    nombre: "Daniela T.",
    texto: "Tenía miedo de comprar en línea, pero el proceso fue clarísimo y me mandaron fotos reales antes de enviar.",
    orden: 5,
    activo: true,
  },
  {
    id: "testi_006",
    nombre: "Sofía L.",
    texto: "El volumen que dan es increíble. Mis mechas quedaron integradas como si fueran mías.",
    orden: 6,
    activo: true,
  },
];
