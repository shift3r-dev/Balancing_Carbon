import { type NextFunction, type Request, type Response } from 'express';

export type Validator = (body: unknown) => string | null;

/** Reusable opt-in validation middleware; existing route validation remains unchanged. */
export function validateBody(validator: Validator) {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = validator(req.body);
    if (error) return res.status(400).json({ error });
    next();
  };
}
