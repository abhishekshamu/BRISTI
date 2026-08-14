import { body, param, query } from 'express-validator';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const optionShapeValid = (options: unknown): boolean => {
  if (!Array.isArray(options)) return false;
  const seen = new Set<string>();
  for (const option of options) {
    if (!option || typeof option !== 'object' || Array.isArray(option)) return false;
    const name = (option as any).name;
    if (!isNonEmptyString(name)) return false;
    const key = (name as string).trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    const values = (option as any).values;
    if (!Array.isArray(values) || values.length === 0) return false;
    for (const value of values) {
      if (!isNonEmptyString(value)) return false;
    }
  }
  return true;
};

const variantShapeValid = (variants: unknown): boolean => {
  if (!Array.isArray(variants)) return false;
  const seenCombos = new Set<string>();
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) return false;
    const v = variant as any;
    if (!isNonEmptyString(v.id) || !isNonEmptyString(v.name)) return false;
    if (typeof v.sku !== 'string') return false;
    if (typeof v.stock !== 'number' || !Number.isFinite(v.stock) || v.stock < 0) return false;
    if (v.priceAdjustment !== undefined && (typeof v.priceAdjustment !== 'number' || !Number.isFinite(v.priceAdjustment))) return false;
    if (v.image !== undefined && typeof v.image !== 'string') return false;
    if (v.options !== undefined) {
      if (!v.options || typeof v.options !== 'object' || Array.isArray(v.options)) return false;
      const seenKeys = new Set<string>();
      for (const key of Object.keys(v.options)) {
        if (!key.trim()) return false;
        const lower = key.trim().toLowerCase();
        if (seenKeys.has(lower)) return false;
        seenKeys.add(lower);
        if (!isNonEmptyString(v.options[key])) return false;
      }
    }
    const comboKey = Object.entries(v.options ?? {})
      .map(([k, val]) => `${k.trim().toLowerCase()}::${String(val).trim().toLowerCase()}`)
      .sort()
      .join('|');
    if (comboKey) {
      if (seenCombos.has(comboKey)) return false;
      seenCombos.add(comboKey);
    }
  }
  return true;
};

export const validateProductVariantsAndOptions = (value: unknown, { req }: any): boolean => {
  const body = req.body ?? {};
  if (body.options !== undefined && !optionShapeValid(body.options)) return false;
  if (body.variants !== undefined && !variantShapeValid(body.variants)) return false;

  // Cross-field integrity (option keys/values must reference the option
  // definitions) can only be enforced when `options` is sent together with
  // `variants`. Partial updates that touch only `variants` keep their
  // structural checks above.
  if (body.options === undefined) return true;
  const options = Array.isArray(body.options) ? body.options : [];
  const optionValues = new Map<string, Set<string>>();
  for (const option of options) {
    optionValues.set(
      option.name.trim().toLowerCase(),
      new Set(option.values.map((v: string) => v.trim().toLowerCase()))
    );
  }
  for (const variant of Array.isArray(body.variants) ? body.variants : []) {
    for (const [key, value] of Object.entries(variant.options ?? {})) {
      const allowed = optionValues.get(key.trim().toLowerCase());
      if (!allowed || !allowed.has(String(value).trim().toLowerCase())) return false;
    }
  }
  return true;
};

export const createProductValidation = [
  body('name').notEmpty().withMessage('Product name is required').trim(),
  body('description').notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('sku').notEmpty().withMessage('SKU is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('options').optional().custom(validateProductVariantsAndOptions).withMessage('Invalid product options structure'),
  body('variants').optional().custom(validateProductVariantsAndOptions).withMessage('Invalid product variants structure'),
];

export const updateProductValidation = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('options').optional().custom(validateProductVariantsAndOptions).withMessage('Invalid product options structure'),
  body('variants').optional().custom(validateProductVariantsAndOptions).withMessage('Invalid product variants structure'),
];

export const searchProductsValidation = [
  query('q').notEmpty().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];