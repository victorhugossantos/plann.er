import { PrismaClient } from "@prisma/client";

// Enviar logs do banco de dados para o servidor
export const prisma = new PrismaClient({
    log: ['query'],
})