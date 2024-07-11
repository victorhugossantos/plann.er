import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import dayjs from "dayjs";
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/pt-br'
import nodemailer from 'nodemailer'
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";


dayjs.locale('pt-br')
dayjs.extend(localizedFormat)


export async function getLinks(app: FastifyInstance) {


    // Validação de dados
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/links', {
        schema:
        {
            params: z.object({
                tripId: z.string().uuid()
            }),
        }
    }, async (request) => {

        const { tripId } = request.params


        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                links: true,

            }
        })


        if (!trip) {
            throw new Error('Trip not found')
        }

        return { links: trip.links }

    })
}
