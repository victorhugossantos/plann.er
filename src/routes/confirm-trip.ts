import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import { prisma } from "../lib/prisma";

export async function confirmTrip(app: FastifyInstance) {


    // Validação de dados
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/confirm', {
        schema: {
            params: z.object({
                tripId: z.string().uuid()
            })
        }
    }, async (request, reply) => {

        const { tripId } = request.params

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId,
            },
            include: {
                participants: {
                    where: {
                        is_owner: false,
                    }
                }
            }
        })

        // verifica se existe o id da Trip existe
        if (!trip) {
            throw new Error("Trip not found.")
        }

        // Verifica se a Trip foi confirmada pelo usuario

        if (trip.is_confirmed) {
            return reply.redirect(`http://localhost:3333/trips/${tripId}`)

        }

        // atualiza no db a viagem como confirmada
        await prisma.trip.update({
            where: { id: tripId },
            data: { is_confirmed: true },
        })




        // pesquisando os participantes da trip no db
        // const participants  = await this.prisma.participants.findMany({
        //     where: {
        //         trip_id: tripId,
        //         is_owner: false,
        //     }
        // })

        const formattedStartDate = dayjs(trip.starts_at).format('LL')
        const formattedEndDate = dayjs(trip.ends_at).format('LL')

        const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm/`


        const mail = await getMailClient()

        await Promise.all(
            trip.participants.map(async (participant) => {

                const confirmationLink = `http://localhost:3333/participants/${participant.id}/confirm`

                const message = await mail.sendMail({
                    from: {
                        name: "Equipe plann.er",
                        address: "oi@plann.er",
                    },
                    to: participant.email,

                    subject: `Confirme sua presença na viagem para ${trip.destination} em ${formattedStartDate}`,
                    html: `
                        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
                            <p> Você foi convidado para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong> ${formattedStartDate} a ${formattedEndDate}</strong>.</p>
                            <p></p>
                            <p> Para confirma a sua presença, clique no link abaixo: </p>
                            <p></p>
                            <p>
                                <a href="${confirmationLink}">Confirmar viagem</a>
                            </p>
                            <p></p>
                            <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
                        </div>
                    `.trim()
                })

                console.log(nodemailer.getTestMessageUrl(message))
            })
        )


        return reply.redirect(`http://localhost:3333/trips/${tripId}`)
    })
}
