import { PrismaClient } from '@prisma/client';

// BigInt nao e serializavel por padrao em JSON. Como usamos IDs BIGINT,
// convertemos para string automaticamente em todas as respostas.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient();
