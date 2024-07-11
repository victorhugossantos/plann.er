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


export async function getActivity(app: FastifyInstance) {


    // Validação de dados
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/activities', {
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
                activities: {
                    orderBy: {
                        occurs_at: 'asc',
                    }
                }
            }
        })

        const differenceInDaysBetweenTripStartAndEnd = dayjs(trip?.ends_at).diff(trip?.starts_at, 'days')

        // retorna os dias da viagem juntamente com as atividades para este dia
        const activities = Array.from({ length: differenceInDaysBetweenTripStartAndEnd + 1 }).map((_, index) => {
            const date = dayjs(trip?.starts_at).add(index, 'days')

            return {
                date: date.toDate(),
                activities: trip?.activities.filter(activity => {
                    return dayjs(activity.occurs_at).isSame(date, 'day')
                })
            }
        })

        if (!trip) {
            throw new Error('Trip not found')
        }

        return { activities }

    })
}
