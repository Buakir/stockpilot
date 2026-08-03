import { describe, expect, it } from "vitest";

import { createProductSchema, parseProductQuery } from "@/lib/validators/product";
import { adjustStockSchema } from "@/lib/validators/stock";

const validProduct = {
  sku: "HER-0001",
  name: "Taladro percutor 750W",
  description: "",
  category_id: 2,
  price: "89990.50",
  stock: "12",
  status: "active",
};

describe("createProductSchema", () => {
  it("acepta un producto válido y convierte los strings del formulario", () => {
    const result = createProductSchema.parse(validProduct);
    expect(result.price).toBe(89990.5);
    expect(result.stock).toBe(12);
    expect(result.category_id).toBe(2);
  });

  it("normaliza el SKU a mayúsculas y sin espacios", () => {
    const result = createProductSchema.parse({ ...validProduct, sku: "  her-0001  " });
    expect(result.sku).toBe("HER-0001");
  });

  it("guarda NULL en vez de cadena vacía para descripción y categoría", () => {
    const result = createProductSchema.parse({
      ...validProduct,
      description: "",
      category_id: null,
    });
    expect(result.description).toBeNull();
    expect(result.category_id).toBeNull();
  });

  it.each([
    ["con espacios", "HER 0001"],
    ["demasiado corto", "H"],
    ["con caracteres inválidos", "HER_0001!"],
  ])("rechaza un SKU %s", (_label, sku) => {
    expect(createProductSchema.safeParse({ ...validProduct, sku }).success).toBe(false);
  });

  it("rechaza un precio negativo", () => {
    expect(createProductSchema.safeParse({ ...validProduct, price: "-1" }).success).toBe(false);
  });

  it("rechaza un precio con más de dos decimales", () => {
    // La columna es NUMERIC(12,2): un tercer decimal se truncaría en silencio.
    expect(createProductSchema.safeParse({ ...validProduct, price: "10.999" }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...validProduct, price: "10.99" }).success).toBe(true);
  });

  it("rechaza un stock decimal o negativo", () => {
    expect(createProductSchema.safeParse({ ...validProduct, stock: "1.5" }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...validProduct, stock: "-3" }).success).toBe(false);
  });

  it("rechaza un estado fuera del enum", () => {
    expect(createProductSchema.safeParse({ ...validProduct, status: "pausado" }).success).toBe(
      false,
    );
  });
});

describe("parseProductQuery", () => {
  it("aplica los valores por defecto cuando no hay filtros", () => {
    const query = parseProductQuery({});
    expect(query).toMatchObject({ sort: "created_at", order: "desc", page: 1, pageSize: 20 });
    expect(query.lowStock).toBe(false);
  });

  it("lee los filtros presentes", () => {
    const query = parseProductQuery({
      q: "taladro",
      categoryId: "2",
      status: "active",
      minPrice: "1000",
      maxPrice: "50000",
      lowStock: "true",
      sort: "price",
      order: "asc",
      page: "3",
      pageSize: "50",
    });

    expect(query).toMatchObject({
      q: "taladro",
      categoryId: 2,
      status: "active",
      minPrice: 1000,
      maxPrice: 50000,
      lowStock: true,
      sort: "price",
      order: "asc",
      page: 3,
      pageSize: 50,
    });
  });

  /**
   * Una URL escrita a mano no debe romper la página: los valores inválidos
   * caen al default en vez de lanzar.
   */
  it.each([
    ["un campo de orden inexistente", { sort: "; DROP TABLE products" }, { sort: "created_at" }],
    ["una dirección de orden inválida", { order: "sideways" }, { order: "desc" }],
    ["una página negativa", { page: "-5" }, { page: 1 }],
    ["un pageSize enorme", { pageSize: "100000" }, { pageSize: 20 }],
    ["un estado inexistente", { status: "zzz" }, { status: undefined }],
    ["un categoryId no numérico", { categoryId: "abc" }, { categoryId: undefined }],
  ])("descarta %s", (_label, input, expected) => {
    expect(parseProductQuery(input)).toMatchObject(expected);
  });

  it("trata la cadena vacía como filtro ausente", () => {
    const query = parseProductQuery({ q: "", status: "" });
    expect(query.q).toBeUndefined();
    expect(query.status).toBeUndefined();
  });

  it("toma el primer valor si un parámetro viene repetido", () => {
    expect(parseProductQuery({ q: ["taladro", "sierra"] }).q).toBe("taladro");
  });
});

describe("adjustStockSchema", () => {
  it("acepta entradas y salidas", () => {
    expect(adjustStockSchema.parse({ delta: 5, reason: "Recepción" }).delta).toBe(5);
    expect(adjustStockSchema.parse({ delta: -5, reason: "Venta" }).delta).toBe(-5);
  });

  it("rechaza un delta de cero", () => {
    expect(adjustStockSchema.safeParse({ delta: 0, reason: "Nada" }).success).toBe(false);
  });

  it("rechaza un delta decimal", () => {
    expect(adjustStockSchema.safeParse({ delta: 1.5, reason: "Medio" }).success).toBe(false);
  });

  it("exige un motivo con contenido", () => {
    expect(adjustStockSchema.safeParse({ delta: 5, reason: "  " }).success).toBe(false);
    expect(adjustStockSchema.safeParse({ delta: 5, reason: "ab" }).success).toBe(false);
    expect(adjustStockSchema.safeParse({ delta: 5, reason: "abc" }).success).toBe(true);
  });

  it("rechaza cantidades desproporcionadas (cero de más al tipear)", () => {
    expect(adjustStockSchema.safeParse({ delta: 999_999, reason: "Error" }).success).toBe(false);
  });
});
